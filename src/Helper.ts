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
  private static taskManager: TaskManager;

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

    console.log('fsPath', uri.fsPath);
    console.log('authority', uri.authority);
    console.log('path', uri.path);
    console.log('fragment', uri.fragment);
    console.log('query', uri.query);

    this.taskManager = TaskManager.instance;
    Persist.initAndLoad(this.taskManager);

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
        if (
          !this.taskManager.activeTask ||
          !this.taskManager.activeTask.activeFile
        ) {
          return;
        }
        const allMarks = this.taskManager.activeTask.activeFile.allMarks;
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
      const activeTask = this.taskManager.activeTask;
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
    if (!this.taskManager.activeTask) {
      return;
    }

    const allMarks = this.taskManager.activeTask.allMarks.reduce<
      QuickPickItem[]
    >((a, i) => {
      if (i != null && i.quickPickItem != null) {
        a.push(i.quickPickItem);
      }
      return a;
    }, []);

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
    const taskNames: string[] = [];
    taskNames.push(this.taskManager.activeTask.name);
    this.taskManager.taskNames.forEach((tn) => {
      if (tn !== this.taskManager.activeTask.name) {
        taskNames.push(tn);
      }
    });
    window.showQuickPick(taskNames, options).then((result) => {
      if (result) {
        this.taskManager.useActiveTask(result);
      } else if (!this.taskManager.activeTask) {
        this.taskManager.useActiveTask('default');
      }
      Helper.persistActiveFile();
    });
  }

  static async createTask() {
    window.showInputBox().then((result) => {
      if (result) {
        this.taskManager.useActiveTask(result);
        Helper.persistActiveFile();
      }
    });
  }

  static deleteTask() {
    window
      .showQuickPick(this.taskManager.taskNames, {
        placeHolder: 'delete Task ',
      })
      .then((result) => {
        if (result) {
          this.taskManager.useActiveTask(result);
          this.taskManager.delete(result);
        } else {
          if (!this.taskManager.activeTask) {
            this.taskManager.useActiveTask('default');
          }
        }
        Helper.persistActiveFile();
      });
  }

  private static persistActiveFile() {
    if (Helper.activeEditor && this.taskManager.activeTask) {
      this.taskManager.activeTask.use(Helper.activeEditor.document.fileName);
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
    this.taskManager.nextMark(activeTextEditor.document.fileName, line);
  }

  static async previousMark() {
    const activeTextEditor = window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }
    const line = activeTextEditor.selection.active.line;
    this.taskManager.previousMark(activeTextEditor.document.fileName, line);
  }

  static async toggleMark() {
    const activeTextEditor = window.activeTextEditor;

    if (!activeTextEditor || !this.taskManager.activeTask) {
      return;
    }
    const activeLine = activeTextEditor.selection.active.line;
    const isDirty = activeTextEditor.document.isDirty;

    this.taskManager.activeTask.toggle(
      activeTextEditor.document.fileName,
      activeLine
    );

    if (!isDirty) {
      Persist.saveTasks();
    }

    this.refresh();
  }

  static changeActiveFile(editor: TextEditor | undefined) {
    if (this._activeEditor === editor || !this.taskManager.activeTask) {
      return;
    }
    this._activeEditor = editor;
    if (editor) {
      this._activeEditorLineCount = editor.document.lineCount;
      this.taskManager.activeTask.use(editor.document.uri.fsPath);
      this.refresh();
    }
  }

  static refresh() {
    if (this._activeEditor) {
      const activeFile = this.taskManager.activeTask.activeFile;

      if (activeFile) {
        DecoratorHelper.refresh(this._activeEditor, activeFile.marks);
      }
    }
  }
}
