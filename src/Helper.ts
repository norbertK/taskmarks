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

  static reportError = ({
    message,
    stack,
  }: {
    message: string;
    stack?: string;
  }) => {
    if (Helper.outputChannel) {
      // send the error to our logging service...
      Helper.outputChannel.appendLine(message);
      if (stack) {
        Helper.outputChannel.appendLine(stack);
      }
      Helper.outputChannel.show(true);
    } else {
      console.log(message);
    }
  };

  // static log = (message: string) => {
  //   if (Helper.outputChannel) {
  //     // log...
  //     Helper.outputChannel.appendLine(message);
  //     Helper.outputChannel.show(true);
  //   } else {
  //     console.log(message);
  //   }
  // };

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
      const stack = Helper.getErrorStack(error);
      Helper.reportError({ message, stack });
      throw error;
    }
  }

  private static triggerChangeActiveFile(): void {
    this._activeEditor = undefined;
    const activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor) {
      this.changeActiveFile(activeTextEditor);
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

      Persist.saveTaskmarksJson();
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
        const allMarks = this._taskManager.activeTask.activeFile.allPathMarks;
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

          Helper.triggerChangeActiveFile();
          Persist.saveTaskmarksJson();
        }
      },
      null,
      context.subscriptions
    );
  }

  static async selectMarkFromList(): Promise<void> {
    if (!this._taskManager.activeTask) {
      return;
    }
    try {
      const options: vscode.QuickPickOptions = {
        placeHolder: 'select Bookmark',
      };

      vscode.window
        .showQuickPick(this._taskManager.activeTask.quickPickItems, options)
        .then((result) => {
          if (result && result.detail && result.description) {
            const lineNumber = Number.parseInt(result.description);
            DecoratorHelper.openAndShow(result.detail, lineNumber);
          }
        });
    } catch (error: unknown) {
      const message = Helper.getErrorMessage(error);
      Helper.reportError({ message });
      throw error;
    }
  }

  static async selectTask(): Promise<void> {
    try {
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
      vscode.window.showQuickPick(taskNames, options).then((taskName) => {
        if (taskName) {
          this._taskManager.useActiveTask(taskName);
        }

        Helper.triggerChangeActiveFile();
        Persist.saveTaskmarksJson();
      });
    } catch (error: unknown) {
      const message = Helper.getErrorMessage(error);
      Helper.reportError({ message });
      throw error;
    }
  }

  static async renameTask(): Promise<void> {
    try {
      const options: vscode.QuickPickOptions = {
        placeHolder: 'rename Task ',
      };
      const taskNames: string[] = [];
      taskNames.push(this._taskManager.activeTask.name);
      this._taskManager.taskNames.forEach((tn) => {
        if (tn !== this._taskManager.activeTask.name) {
          taskNames.push(tn);
        }
      });
      vscode.window.showQuickPick(taskNames, options).then((oldTaskName) => {
        if (oldTaskName) {
          vscode.window.showInputBox().then((newTaskName) => {
            if (newTaskName) {
              this._taskManager.renameTask(oldTaskName, newTaskName);
            }
          });
        }

        Helper.triggerChangeActiveFile();
        Persist.saveTaskmarksJson();
      });
    } catch (error: unknown) {
      const message = Helper.getErrorMessage(error);
      Helper.reportError({ message });
      throw error;
    }
  }

  static async createTask(): Promise<void> {
    try {
      vscode.window.showInputBox().then((newTaskName) => {
        if (newTaskName) {
          this._taskManager.useActiveTask(newTaskName);

          Helper.triggerChangeActiveFile();
          Persist.saveTaskmarksJson();
        }
      });
    } catch (error: unknown) {
      const message = Helper.getErrorMessage(error);
      Helper.reportError({ message });
      throw error;
    }
  }

  static deleteTask(): void {
    try {
      vscode.window
        .showQuickPick(this._taskManager.taskNames, {
          placeHolder: 'delete Task ',
        })
        .then((taskName) => {
          if (taskName) {
            this._taskManager.delete(taskName);
          }

          Helper.triggerChangeActiveFile();
          Persist.saveTaskmarksJson();
        });
    } catch (error: unknown) {
      const message = Helper.getErrorMessage(error);
      Helper.reportError({ message });
      throw error;
    }
  }

  static async nextMark(): Promise<void> {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }
    const line = activeTextEditor.selection.active.line;
    this._taskManager.nextMark(line);
  }

  static async previousMark(): Promise<void> {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }
    const line = activeTextEditor.selection.active.line;
    this._taskManager.previousMark(line);
  }

  static async toggleMark(): Promise<void> {
    try {
      const activeTextEditor = vscode.window.activeTextEditor;
      let enableLabel = vscode.workspace
        .getConfiguration()
        .get<boolean>('taskmarks.enableLabel');
      enableLabel = enableLabel ? true : false;

      if (!activeTextEditor || !this._taskManager.activeTask) {
        return;
      }
      const activeLine = activeTextEditor.selection.active.line;

      const fullName = activeTextEditor.document.fileName;
      if (
        enableLabel &&
        !this._taskManager.activeTask.lineHasMark(fullName, activeLine)
      ) {
        vscode.window.showInputBox().then((newLabel) => {
          if (newLabel) {
            this._taskManager.activeTask.toggle(fullName, activeLine, newLabel);
          }
          Persist.saveTaskmarksJson();
          Helper.triggerChangeActiveFile();
        });
      } else {
        this._taskManager.activeTask.toggle(
          activeTextEditor.document.fileName,
          activeLine,
          ''
        );
        Persist.saveTaskmarksJson();
        Helper.triggerChangeActiveFile();
      }
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

  private static toErrorWithMessageAndStack(
    maybeError: unknown
  ): ErrorWithMessage {
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
    return Helper.toErrorWithMessageAndStack(error).message;
  }

  static getErrorStack(error: unknown) {
    return Helper.toErrorWithMessageAndStack(error).stack;
  }
}

type ErrorWithMessage = {
  message: string;
  stack?: string | undefined;
};
