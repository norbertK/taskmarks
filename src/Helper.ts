import * as vscode from 'vscode';

import { Tasks } from './Tasks';
import { Persist } from './Persist';
import { DecoratorHelper } from './DecoratorHelper';
import { PathHelper } from './PathHelper';

export class Helper {
  private static _activeEditorLineCount: number;
  private static _activeEditor: vscode.TextEditor | undefined;
  private static _tasks: Tasks;

  public static get activeEditor() {
    return this._activeEditor;
  }

  public static init(context: vscode.ExtensionContext) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      // vscode.window.showErrorMessage('Could not find a workspace');
      throw new Error('Could not find a workspace');
    }

    const workspaceFolder: vscode.WorkspaceFolder = workspaceFolders[0];
    const uri: vscode.Uri = workspaceFolder.uri;
    PathHelper.basePath = uri.fsPath;

    this._tasks = Tasks.instance();
    Persist.initAndLoad(this._tasks);

    DecoratorHelper.initDecorator(context);

    Helper.handleEditorChange();
    Helper.handleSave();
    Helper.handleChange(context);

    // this._tasks.dumpToLog();
  }

  private static handleEditorChange() {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor) {
      this.changeActiveFile(activeTextEditor);
    }
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      this.changeActiveFile(editor);
    }, null);
  }

  private static handleChange(context: vscode.ExtensionContext) {
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
        if (!this._tasks.activeTask || !this._tasks.activeTask.activeFile) {
          return;
        }
        const allMarks = this._tasks.activeTask.activeFile.allMarks;
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
    vscode.workspace.onDidSaveTextDocument((textDocument) => {
      const activeTask = this._tasks.activeTask;
      if (!activeTask) {
        return;
      }
      const file = activeTask.getFile(
        PathHelper.reducePath(textDocument.fileName)
      );
      if (file) {
        file.unDirty();
      }
      Persist.saveTasks();
    });
  }

  //SELECT FROM LIST

  public static async selectMarkFromList() {
    if (!this._tasks.activeTask) {
      return;
    }

    const allMarks = this._tasks.activeTask.allMarks.reduce<
      vscode.QuickPickItem[]
    >((a, i) => {
      if (i != null && i.quickPickItem != null) {
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

  public static async selectTask() {
    const options: vscode.QuickPickOptions = {
      placeHolder: 'select Task ',
    };
    const taskNames: Array<string> = [];
    taskNames.push(this._tasks.activeTask.name);
    this._tasks.taskNames.forEach((tn) => {
      if (tn !== this._tasks.activeTask.name) {
        taskNames.push(tn);
      }
    });
    vscode.window.showQuickPick(taskNames, options).then((result) => {
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
    vscode.window.showInputBox().then((result) => {
      if (result) {
        this._tasks.use(result);
        Helper.persistActiveFile();
      }
    });
  }

  public static deleteTask() {
    vscode.window
      .showQuickPick(this._tasks.taskNames, { placeHolder: 'delete Task ' })
      .then((result) => {
        if (result) {
          this._tasks.use(result);
          this._tasks.delete(result);
        } else {
          if (!this._tasks.activeTask) {
            this._tasks.use('default');
          }
        }
        Helper.persistActiveFile();
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
    const line = activeTextEditor.selection.active.line;
    this._tasks.nextMark(activeTextEditor.document.fileName, line);
  }

  public static async previousMark() {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }
    const line = activeTextEditor.selection.active.line;
    this._tasks.previousMark(activeTextEditor.document.fileName, line);
  }

  public static async toggleMark() {
    const activeTextEditor = vscode.window.activeTextEditor;

    if (!activeTextEditor) {
      return;
    }
    if (!this._tasks.activeTask) {
      return;
    }

    const activeLine = activeTextEditor.selection.active.line;
    const isDirty = activeTextEditor.document.isDirty;

    this._tasks.activeTask.toggle(
      activeTextEditor.document.fileName,
      activeLine
    );

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
