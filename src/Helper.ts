import * as vscode from 'vscode';

import { TaskManager } from './TaskManager';
import { Persist } from './Persist';
import { DecoratorHelper } from './DecoratorHelper';
import { PathHelper } from './PathHelper';

export abstract class Helper {
  private static _activeEditorLineCount: number;
  private static _activeEditor: vscode.TextEditor | undefined;
  private static _taskManager: TaskManager;

  static get activeEditor(): vscode.TextEditor | undefined {
    return this._activeEditor;
  }

  static init(context: vscode.ExtensionContext): void {
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

      if (file) {
        file.unDirtyAll();
      }
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
              // console.log('Helper.handleChange() ');
              mark.setLineNumber(activeFile, diffLine + 1);
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

  static async selectMarkFromList(): Promise<void> {
    if (!this._taskManager.activeTask) {
      return;
    }

    const allMarks = this._taskManager.activeTask.allMarks.reduce<
      vscode.QuickPickItem[]
    >((a, i) => {
      if (
        i !== null &&
        i.quickPickItem !== null &&
        i.quickPickItem !== undefined
      ) {
        a.push(i.quickPickItem);
      }
      return a;
    }, []);

    const options: vscode.QuickPickOptions = {
      placeHolder: 'select Bookmark',
    };

    vscode.window.showQuickPick(allMarks, options).then((result) => {
      if (result && result.detail) {
        const mark = Number.parseInt(result.label);

        DecoratorHelper.openAndShow(result.detail, mark);
      }
    });
  }

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
    const activeTextEditor = vscode.window.activeTextEditor;

    if (!activeTextEditor || !this._taskManager.activeTask) {
      return;
    }
    const activeLine = activeTextEditor.selection.active.line;
    const isDirty = activeTextEditor.document.isDirty;

    this._taskManager.activeTask.toggle(
      activeTextEditor.document.fileName,
      activeLine
    );

    if (!isDirty) {
      Persist.saveTasks();
    }

    this.refresh();
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
}
