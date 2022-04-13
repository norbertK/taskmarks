import * as vscode from 'vscode';

import { TaskManager } from './TaskManager';
import { Persist } from './Persist';
import { DecoratorHelper } from './DecoratorHelper';
import { PathHelper } from './PathHelper';

export abstract class Helper {
  private static _activeEditorLineCount: number;
  private static _activeEditor: vscode.TextEditor | undefined;
  private static _taskManager: TaskManager;
  private static _outputChannel: vscode.OutputChannel;

  static reportError = ({ message }: { message: string }) => {
    // send the error to our logging service...
    Helper.outputChannel.appendLine(message);
    Helper.outputChannel.show(true);
  };

  static get activeEditor(): vscode.TextEditor | undefined {
    return this._activeEditor;
  }
  static get outputChannel(): vscode.OutputChannel {
    return this._outputChannel;
  }

  static init(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ): void {
    try {
      Helper._outputChannel = outputChannel;

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        throw new Error('Could not find a workspace');
      }

      const workspaceFolder: vscode.WorkspaceFolder = workspaceFolders[0];
      const uri: vscode.Uri = workspaceFolder.uri;
      PathHelper.basePath = uri.fsPath;

      this._taskManager = TaskManager.instance;
      Persist.initAndLoad(this._taskManager);

      DecoratorHelper.initDecorator(context);

      Helper.handleEditorChange();
      Helper.handleSave();
      Helper.handleChange(context);
    } catch (error: unknown) {
      const message = Helper.getErrorMessage(error);
      Helper.reportError({ message });
      throw error;
    }
  }

  private static handleEditorChange(): void {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor) {
      this.changeActiveFile(activeTextEditor);
    }
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      this.changeActiveFile(editor);
    }, null);
  }

  private static handleSave(): void {
    vscode.workspace.onDidSaveTextDocument((textDocument) => {
      const activeTask = this._taskManager.activeTask;
      if (!activeTask) {
        return;
      }
      const file = activeTask.getFile(
        PathHelper.reducePath(textDocument.fileName)
      );

      Persist.saveTasks();
    });
  }

  private static handleChange(context: vscode.ExtensionContext): void {
    let lastEditorWithChanges: vscode.TextEditor | undefined = undefined;
    let lastLineCount: number;
    vscode.workspace.onDidChangeTextDocument(
      (event) => {
        if (
          !this._activeEditor ||
          event.document !== this._activeEditor.document
        ) {
          return;
        }
        if (lastEditorWithChanges !== this._activeEditor) {
          lastEditorWithChanges = this._activeEditor;
          lastLineCount = this._activeEditorLineCount;
        }
        if (
          !this._taskManager.activeTask ||
          !this._taskManager.activeTask.activeFile
        ) {
          return;
        }
        const activeFile = this._taskManager.activeTask.activeFile;
        const allMarks = this._taskManager.activeTask.activeFile.allMarks;
        if (allMarks.length === 0) {
          return;
        }
        if (!event.contentChanges || event.contentChanges.length === 0) {
          return;
        }
        const startLine = event.contentChanges[0].range.start.line;
        let diffLine: number;
        if (event.document.lineCount !== lastLineCount) {
          diffLine = event.document.lineCount - lastLineCount;
          allMarks.forEach((mark) => {
            if (mark.lineNumber && mark.lineNumber > startLine) {
              mark.lineNumber = diffLine + 1;
            }
          });
          lastLineCount += diffLine;
          this.refresh();
        }
      },
      null,
      context.subscriptions
    );
  }

  //SELECT FROM LIST

  // static async selectMarkFromList(): Promise<void> {
  //   if (!this._taskManager.activeTask) {
  //     return;
  //   }

  //   this._taskManager.activeTask.allMarks.reduce<vscode.QuickPickItem[]>(
  //     (quickPickItems, mark) => {
  //       if (mark !== null) {
  //         this.getQuickPickItem(mark.fullPath, mark.lineNumber).then(
  //           (quickPickItem) => {
  //             quickPickItems.push(quickPickItem);
  //           }
  //         );
  //       }

  //       const options: vscode.QuickPickOptions = {
  //         placeHolder: 'select Bookmark',
  //       };

  //       vscode.window.showQuickPick(quickPickItems, options).then((result) => {
  //         if (result && result.detail) {
  //           const mark = Number.parseInt(result.label);

  //           DecoratorHelper.openAndShow(result.detail, mark);
  //         }
  //       });
  //       return quickPickItems;
  //     },
  //     []
  //   );
  // }

  // static async getQuickPickItem(
  //   filepath: string,
  //   lineNumber: number,
  //   label = ''
  // ): Promise<vscode.QuickPickItem> {
  //   if (lineNumber === null) {
  //     throw new Error(
  //       `Mark.getQuickPickItem() - lineNumber not set! - ${filepath}`
  //     );
  //   }

  //   return new Promise<vscode.QuickPickItem>((res) => {
  //     const fullPath = PathHelper.getFullPath(filepath);
  //     if (fullPath === null || fullPath === undefined) {
  //       throw new Error(
  //         `Mark.getQuickPickItem() - File not found! - ${filepath}`
  //       );
  //     }
  //     const uri = vscode.Uri.file(fullPath);

  //     vscode.workspace.openTextDocument(uri).then((doc) => {
  //       if (doc === undefined) {
  //         throw new Error(
  //           `Mark.getQuickPickItem() - vscode.workspace.openTextDocument(${uri}) should not be undefined`
  //         );
  //       }
  //       if (lineNumber <= doc.lineCount) {
  //         const lineText = doc.lineAt(lineNumber).text;
  //         const quickPickItem: vscode.QuickPickItem = {
  //           label: lineNumber.toString(),
  //           description: label ? label : lineText,
  //           detail: fullPath,
  //         };
  //         res(quickPickItem);
  //       }
  //     });
  //   });
  // }

  static async selectTask(): Promise<void> {
    const options: vscode.QuickPickOptions = {
      placeHolder: 'select Task ',
    };
    const taskNames: string[] = [];
    taskNames.push(this._taskManager.activeTask.name);
    this._taskManager.taskNames.forEach((tn) => {
      if (tn !== this._taskManager.activeTask.name) {
        taskNames.push(tn);
      }
    });
    vscode.window.showQuickPick(taskNames, options).then((result) => {
      if (result) {
        this._taskManager.useActiveTask(result);
      } else if (!this._taskManager.activeTask) {
        this._taskManager.useActiveTask('default');
      }
      Helper.persistActiveFile();
    });
  }

  static async createTask(): Promise<void> {
    vscode.window.showInputBox().then((result) => {
      if (result) {
        this._taskManager.useActiveTask(result);
        Helper.persistActiveFile();
      }
    });
  }

  static deleteTask(): void {
    vscode.window
      .showQuickPick(this._taskManager.taskNames, {
        placeHolder: 'delete Task ',
      })
      .then((result) => {
        if (result) {
          this._taskManager.useActiveTask(result);
          this._taskManager.delete(result);
        } else {
          if (!this._taskManager.activeTask) {
            this._taskManager.useActiveTask('default');
          }
        }
        Helper.persistActiveFile();
      });
  }

  private static persistActiveFile(): void {
    if (Helper.activeEditor && this._taskManager.activeTask) {
      this._taskManager.activeTask.use(Helper.activeEditor.document.fileName);
    }
    Persist.saveTasks();
    this.refresh();
  }

  static async nextMark(): Promise<void> {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }
    const line = activeTextEditor.selection.active.line;
    this._taskManager.nextMark(activeTextEditor.document.fileName, line);
  }

  static async previousMark(): Promise<void> {
    // console.log('Helper.previousMark()');

    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }
    const line = activeTextEditor.selection.active.line;
    // console.log('Helper.previousMark() line ==', line);
    this._taskManager.previousMark(activeTextEditor.document.fileName, line);
  }

  static async toggleMark(): Promise<void> {
    try {
      const activeTextEditor = vscode.window.activeTextEditor;

      if (!activeTextEditor || !this._taskManager.activeTask) {
        return;
      }
      const activeLine = activeTextEditor.selection.active.line;
      // const isDirty = activeTextEditor.document.isDirty;

      this._taskManager.activeTask.toggle(
        activeTextEditor.document.fileName,
        activeLine
      );

      // if (!isDirty) {
      Persist.saveTasks();
      // }

      this.refresh();
    } catch (error: unknown) {
      Helper.reportError({ message: Helper.getErrorMessage(error) });
    }
  }

  static changeActiveFile(editor: vscode.TextEditor | undefined): void {
    if (this._activeEditor === editor || !this._taskManager.activeTask) {
      return;
    }
    this._activeEditor = editor;
    if (editor) {
      this._activeEditorLineCount = editor.document.lineCount;
      this._taskManager.activeTask.use(editor.document.uri.fsPath);
      this.refresh();
    }
  }

  static refresh(): void {
    if (this._activeEditor) {
      const activeFile = this._taskManager.activeTask.activeFile;

      if (activeFile) {
        DecoratorHelper.refresh(this._activeEditor, activeFile.lineNumbers);
      }
    }
  }

  private static isErrorWithMessage(error: unknown): error is ErrorWithMessage {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as Record<string, unknown>).message === 'string'
    );
  }

  private static toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
    if (Helper.isErrorWithMessage(maybeError)) {
      return maybeError;
    }

    try {
      return new Error(JSON.stringify(maybeError));
    } catch {
      // fallback in case there's an error stringifying the maybeError
      // like with circular references for example.
      return new Error(String(maybeError));
    }
  }

  static getErrorMessage(error: unknown) {
    return Helper.toErrorWithMessage(error).message;
  }
}

type ErrorWithMessage = {
  message: string;
};
