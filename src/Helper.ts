import {
  window,
  workspace,
  ExtensionContext,
  QuickPickItem,
  QuickPickOptions,
  TextEditor,
  Uri,
  WorkspaceFolder,
} from 'vscode';

import { TaskManager } from './TaskManager';
import { Persist } from './Persist';
import { DecoratorHelper } from './DecoratorHelper';
import { PathHelper } from './PathHelper';

export class Helper {
  private static _activeEditorLineCount: number;
  private static _activeEditor: TextEditor | undefined;
  private static _tasks: TaskManager;

  static get activeEditor() {
    return this._activeEditor;
  }

  static init(context: ExtensionContext) {
    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders) {
      // window.showErrorMessage('Could not find a workspace');
      throw new Error('Could not find a workspace');
    }

    const workspaceFolder: WorkspaceFolder = workspaceFolders[0];
    const uri: Uri = workspaceFolder.uri;
    PathHelper.basePath = uri.fsPath;

    this._tasks = TaskManager.instance();
    Persist.initAndLoad(this._tasks);

    DecoratorHelper.initDecorator(context);

    Helper.handleEditorChange();
    Helper.handleSave();
    Helper.handleChange(context);
  }

  private static handleEditorChange() {
    const activeTextEditor = window.activeTextEditor;
    if (activeTextEditor) {
      this.changeActiveFile(activeTextEditor);
    }
    window.onDidChangeActiveTextEditor((editor) => {
      this.changeActiveFile(editor);
    }, null);
  }

  private static handleChange(context: ExtensionContext) {
    let lastEditorWithChanges: TextEditor | undefined = undefined;
    let lastLineCount: number;
    workspace.onDidChangeTextDocument(
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
    workspace.onDidSaveTextDocument((textDocument) => {
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

  static async selectMarkFromList() {
    if (!this._tasks.activeTask) {
      return;
    }

    const allMarks = this._tasks.activeTask.allMarks.reduce<QuickPickItem[]>(
      (a, i) => {
        if (i != null && i.quickPickItem != null) {
          a.push(i.quickPickItem);
        }
        return a;
      },
      []
    );

    const options: QuickPickOptions = {
      placeHolder: 'select Bookmark',
    };

    window.showQuickPick(allMarks, options).then((result) => {
      if (result && result.detail) {
        const mark = Number.parseInt(result.label);

        DecoratorHelper.openAndShow(result.detail, mark);
      }
    });
  }

  static async selectTask() {
    const options: QuickPickOptions = {
      placeHolder: 'select Task ',
    };
    const taskNames: Array<string> = [];
    taskNames.push(this._tasks.activeTask.name);
    this._tasks.taskNames.forEach((tn) => {
      if (tn !== this._tasks.activeTask.name) {
        taskNames.push(tn);
      }
    });
    window.showQuickPick(taskNames, options).then((result) => {
      if (result) {
        this._tasks.useActiveTask(result);
      } else if (!this._tasks.activeTask) {
        this._tasks.useActiveTask('default');
      }
      Helper.persistActiveFile();
    });
  }

  static async createTask() {
    window.showInputBox().then((result) => {
      if (result) {
        this._tasks.useActiveTask(result);
        Helper.persistActiveFile();
      }
    });
  }

  static deleteTask() {
    window
      .showQuickPick(this._tasks.taskNames, { placeHolder: 'delete Task ' })
      .then((result) => {
        if (result) {
          this._tasks.useActiveTask(result);
          this._tasks.delete(result);
        } else {
          if (!this._tasks.activeTask) {
            this._tasks.useActiveTask('default');
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

  static async nextMark() {
    const activeTextEditor = window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }
    const line = activeTextEditor.selection.active.line;
    this._tasks.nextMark(activeTextEditor.document.fileName, line);
  }

  static async previousMark() {
    const activeTextEditor = window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }
    const line = activeTextEditor.selection.active.line;
    this._tasks.previousMark(activeTextEditor.document.fileName, line);
  }

  static async toggleMark() {
    window.showInputBox({ prompt: 'Enter a mark label' }).then((label) => {
      const activeTextEditor = window.activeTextEditor;

      if (!activeTextEditor || !this._tasks.activeTask) {
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
    });
  }

  static changeActiveFile(editor: TextEditor | undefined) {
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

  static refresh() {
    if (this._activeEditor) {
      const activeFile = this._tasks.activeTask.activeFile;

      if (activeFile) {
        DecoratorHelper.refresh(this._activeEditor, activeFile.marks);
      }
    }
  }
}
