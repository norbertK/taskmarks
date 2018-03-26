'use strict';

import * as vscode from 'vscode';
import fs = require('fs');

import { Tasks } from './Tasks';
import { Persist } from './Persist';

export class Helper {
  private static _activeEditorLineCount: number;
  private static _iconPath: string;
  private static _vscTextEditorDecorationType: vscode.TextEditorDecorationType;
  private static _activeEditor: vscode.TextEditor | undefined;
  private static _tasks: Tasks;
  private static _basePath: string;

  public static get basePath(): string {
    return this._basePath;
  }

  public static set basePath(basePath: string) {
    this._basePath = basePath;
  }

  public static get activeEditor() {
    return this._activeEditor;
  }

  public static init(context: vscode.ExtensionContext) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('Error loading vscode.workspace! Stop!');
      throw new Error('Error loading vscode.workspace! Stop!');
    }

    const workspaceFolder: vscode.WorkspaceFolder = workspaceFolders[0];
    const uri: vscode.Uri = workspaceFolder.uri;
    this._basePath = uri.fsPath;

    this._tasks = Tasks.instance();
    Persist.loadTasks(this._tasks);

    Helper.initDecorator(context);

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
      var file = activeTask.getFile(this.reducePath(textDocument.fileName));
      if (file) {
        file.unDirty();
      }
      Persist.saveTasks();
    });
  }

  private static initDecorator(context: vscode.ExtensionContext) {
    this._iconPath = context.asAbsolutePath('images/bookmark.svg');
    this._vscTextEditorDecorationType = vscode.window.createTextEditorDecorationType({
      gutterIconPath: this._iconPath,
      overviewRulerLane: vscode.OverviewRulerLane.Full,
      overviewRulerColor: 'rgba(196, 196, 0, 0.8)'
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

        Helper.openAndShow(result.detail, mark);
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

  public static filepath(path: string | undefined): string | undefined {
    const pathWithBasePath = this.basePath + path;
    const pwbExists = fs.existsSync(pathWithBasePath);
    if (pwbExists) {
      return pathWithBasePath;
    }
    if (path) {
      const pExists = fs.existsSync(path);
      if (pExists) {
        return path;
      }
    }
    return undefined;
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

  public static reducePath(filePath: string): string {
    if (filePath.startsWith(this._basePath)) {
      filePath = filePath.substring(this._basePath.length);
    }
    return filePath;
  }

  public static refresh() {
    if (!this._activeEditor || !this._tasks.activeTask || !this._tasks.activeTask.activeFile) {
      return;
    }

    let ranges: vscode.Range[] = [];

    const marks = this._tasks.activeTask.activeFile.marks;
    if (marks.length > 0) {
      for (let mark of marks) {
        let vscRange = new vscode.Range(mark, 0, mark, 0);
        ranges.push(vscRange);
      }
    }

    this._activeEditor.setDecorations(this._vscTextEditorDecorationType, ranges);
  }

  public static showLine(line: number) {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }
    let reviewType: vscode.TextEditorRevealType = vscode.TextEditorRevealType.InCenter;
    if (line === activeTextEditor.selection.active.line) {
      reviewType = vscode.TextEditorRevealType.InCenterIfOutsideViewport;
    }
    let vscSelection = new vscode.Selection(line, 0, line, 0);
    activeTextEditor.selection = vscSelection;
    activeTextEditor.revealRange(vscSelection, reviewType);
  }

  public static openAndShow(filepath: string | undefined, mark: number | undefined = undefined): void {
    filepath = this.filepath(filepath);
    if (!filepath) {
      return;
    }

    vscode.workspace.openTextDocument(filepath).then(textDocument => {
      if (textDocument) {
        vscode.window.showTextDocument(textDocument).then(editor => {
          if (mark) {
            this.showLine(mark);
          } else {
            if (!this._tasks.activeTask || !this._tasks.activeTask.activeFile || this._tasks.activeTask.activeFile.marks.length === 0) {
              return;
            }
            this.showLine(this._tasks.activeTask.activeFile.marks[0]);
          }
        });
      }
    });
  }

  public static async getQuickPickItem(path: string | undefined, mark: number | undefined): Promise<vscode.QuickPickItem> {
    return new Promise<vscode.QuickPickItem>((resolve, reject) => {
      let filepath = Helper.filepath(path);
      let quickPickItem: vscode.QuickPickItem;

      if (!filepath) {
        reject('File not found! - ' + path);
        return;
      }
      if (!mark) {
        reject('Mark not set! - ' + path);
        return;
      }
      let uri: vscode.Uri = vscode.Uri.file(filepath);
      vscode.workspace.openTextDocument(uri).then(doc => {
        if (mark <= doc.lineCount) {
          let lineText = doc.lineAt(mark).text;
          quickPickItem = {
            label: mark.toString(),
            description: lineText,
            detail: filepath
          };
          resolve(quickPickItem);
        }
      });
    });
  }
}
