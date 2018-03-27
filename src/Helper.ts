'use strict';

import * as vscode from 'vscode';

import { Tasks } from './Tasks';
import { Persist } from './Persist';
import { DecoratorHelper } from './DecoratorHelper';
import { DebLog } from './DebLog';
import { PathHelper } from './PathHelper';

export class Helper {
  private static _activeEditorLineCount: number;
  private static _activeEditor: vscode.TextEditor | undefined;
  private static _tasks: Tasks;
  private static deb: DebLog;

  public static get activeEditor() {
    return this._activeEditor;
  }

  public static init(context: vscode.ExtensionContext) {
    this.deb = new DebLog();
    this.deb.log('init');
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('Error loading vscode.workspace! Stop!');
      throw new Error('Error loading vscode.workspace! Stop!');
    }

    const workspaceFolder: vscode.WorkspaceFolder = workspaceFolders[0];
    const uri: vscode.Uri = workspaceFolder.uri;
    PathHelper.basePath = uri.fsPath;

    this._tasks = Tasks.instance();
    Persist.loadTasks(this._tasks);

    DecoratorHelper.initDecorator(context);

    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }
    this.changeActiveFile(activeTextEditor);
    vscode.window.onDidChangeActiveTextEditor(editor => {
      this.changeActiveFile(editor);
    }, null);

    Helper.handleSave();
    Helper.handleChange(context);
  }

  private static handleChange(context: vscode.ExtensionContext) {
    let lastEditorWithChanges: vscode.TextEditor | undefined = undefined;
    let lastLineCount: number;
    vscode.workspace.onDidChangeTextDocument(
      event => {
        if (!this._activeEditor || event.document !== this._activeEditor.document) {
          return;
        }
        if (lastEditorWithChanges !== this._activeEditor) {
          lastEditorWithChanges = this._activeEditor;
          lastLineCount = this._activeEditorLineCount;
        }
        if (!this._tasks.activeTask || !this._tasks.activeTask.activeFile) {
          return;
        }
        let allMarks = this._tasks.activeTask.activeFile.allMarks;
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
          allMarks.forEach(mark => {
            if (mark.lineNumber && mark.lineNumber > startLine) {
              mark.lineNumber += diffLine;
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

  private static handleSave() {
    vscode.workspace.onDidSaveTextDocument(textDocument => {
      var activeTask = this._tasks.activeTask;
      if (!activeTask) {
        return;
      }
      var file = activeTask.getFile(PathHelper.reducePath(textDocument.fileName));
      if (file) {
        file.unDirty();
      }
      Persist.saveTasks();
    });
  }

  public static async selectMarkFromList() {
    if (!this._tasks.activeTask) {
      return;
    }
    let allMarks: Array<vscode.QuickPickItem> = [];
    let all = this._tasks.activeTask.allMarks.map(mark => mark.quickPickItem);
    all.forEach(qpi => {
      if (qpi) {
        allMarks.push(qpi);
      }
    });
    vscode.window.showQuickPick(allMarks, { placeHolder: 'select Bookmark' }).then(result => {
      if (result && result.detail) {
        let mark = Number.parseInt(result.label);

        DecoratorHelper.openAndShow(result.detail, mark);
      }
    });
  }

  public static async selectTask() {
    vscode.window.showQuickPick(this._tasks.taskNames, { placeHolder: 'select Task ' }).then(result => {
      if (result) {
        this._tasks.use(result);
      } else {
        if (!this._tasks.activeTask) {
          this._tasks.use('default');
        }
      }
      Helper.persistActiveFile();
    });
  }

  public static async createTask() {
    vscode.window.showInputBox().then(result => {
      if (result) {
        this._tasks.use(result);
        Helper.persistActiveFile();
      }
    });
  }

  private static persistActiveFile() {
    if (Helper.activeEditor && this._tasks.activeTask) {
      this._tasks.activeTask.use(Helper.activeEditor.document.fileName);
    }
    Persist.saveTasks();
    this.refresh();
  }

  public static async nextMark() {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }
    let line = activeTextEditor.selection.active.line;
    this._tasks.nextMark(activeTextEditor.document.fileName, line);
  }

  public static async previousMark() {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }
    let line = activeTextEditor.selection.active.line;
    this._tasks.previousMark(activeTextEditor.document.fileName, line);
  }

  public static async toggleMark() {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor || !this._tasks.activeTask) {
      return;
    }
    let line = activeTextEditor.selection.active.line;
    let isDirty = activeTextEditor.document.isDirty;

    this._tasks.activeTask.toggle(activeTextEditor.document.fileName, line);

    if (!isDirty) {
      Persist.saveTasks();
    }

    this.refresh();
  }

  public static changeActiveFile(editor: vscode.TextEditor | undefined) {
    if (this._activeEditor === editor || !this._tasks.activeTask) {
      return;
    }
    this._activeEditor = editor;
    if (editor) {
      this._activeEditorLineCount = editor.document.lineCount;
      this._tasks.activeTask.use(editor.document.uri.fsPath);
      this.refresh();
    }
  }

  public static refresh() {
    if (this._activeEditor) {
      const activeFile = this._tasks.activeTask.activeFile;
      if (activeFile) {
        DecoratorHelper.refresh(this._activeEditor, activeFile.marks);
      }
    }
  }
}
