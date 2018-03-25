'use strict';

import * as vscode from 'vscode';
import fs = require('fs');

import { Tasks } from './Tasks';
import { Persist } from './Persist';

import { debLog, debIn, debOut } from './DebLog';
const className = 'Helper';
function ind(methodName: string, text = '') {
  debIn(className, methodName, text);
}
function out(methodName: string, text = '') {
  debOut(className, methodName, text);
}
function log(methodName: string, text = '') {
  debLog(className, methodName, text);
}

export class Helper {
  private static _activeEditorLineCount: number;
  private static _vscContext: vscode.ExtensionContext;
  private static _iconPath: string;
  private static _vscTextEditorDecorationType: vscode.TextEditorDecorationType;
  private static _activeEditor: vscode.TextEditor;
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
    ind('init');

    this._basePath = vscode.workspace.rootPath;

    this._tasks = Tasks.instance();
    Persist.loadTasks(this._tasks);

    this._vscContext = context;
    this._iconPath = context.asAbsolutePath('images/bookmark.svg');

    this._vscTextEditorDecorationType = vscode.window.createTextEditorDecorationType({
      gutterIconPath: this._iconPath,
      overviewRulerLane: vscode.OverviewRulerLane.Full,
      overviewRulerColor: 'rgba(196, 196, 0, 0.8)'
    });

    this.changeActiveFile(vscode.window.activeTextEditor);
    vscode.window.onDidChangeActiveTextEditor(editor => {
      this.changeActiveFile(editor);
    }, null);

    vscode.workspace.onDidSaveTextDocument(textDocument => {
      var activeTask = this._tasks.activeTask;
      var file = activeTask.getFile(this.reducePath(textDocument.fileName));
      if (file) {
        file.unDirty();
      }
      Persist.saveTasks();
    });

    let lastEditorWithChanges: vscode.TextEditor = undefined;
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

        let allMarks = this._tasks.activeTask.activeFile.allMarks;
        if (allMarks.length === 0) {
          return;
        }

        if (!event.contentChanges || event.contentChanges.length === 0) {
          return;
        }
        const startLine = event.contentChanges[0].range.start.line;
        log('init.onDidChangeTextDocument()', 'startLine === ' + startLine);

        let diffLine: number;
        if (event.document.lineCount !== lastLineCount) {
          diffLine = event.document.lineCount - lastLineCount;

          allMarks.forEach(mark => {
            if (mark.lineNumber > startLine) {
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

    out('init');
  }

  public static async selectMarkFromList() {
    let allMarks: Array<vscode.QuickPickItem> = this._tasks.activeTask.allMarks.map(mark => mark.quickPickItem);
    vscode.window.showQuickPick(allMarks, { placeHolder: 'select Bookmark' }).then(result => {
      if (result) {
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

      this._tasks.activeTask.use(Helper.activeEditor.document.fileName);

      Persist.saveTasks();
      Helper.refresh();
    });
  }

  public static async createTask() {
    vscode.window.showInputBox().then(result => {
      if (result) {
        this._tasks.use(result);
      }

      this._tasks.activeTask.use(Helper.activeEditor.document.fileName);

      Persist.saveTasks();
      this.refresh();
    });
  }

  public static async nextMark() {
    ind('nextMark');
    let line = vscode.window.activeTextEditor.selection.active.line;
    this._tasks.nextMark(Helper.activeEditor.document.fileName, line);
    out('nextMark');
  }

  public static async previousMark() {
    let line = vscode.window.activeTextEditor.selection.active.line;
    this._tasks.previousMark(Helper.activeEditor.document.fileName, line);
  }

  public static async toggleMark() {
    ind('toggleMark');

    const activeTextEditor = vscode.window.activeTextEditor;
    let line = activeTextEditor.selection.active.line;
    let isDirty = activeTextEditor.document.isDirty;

    this._tasks.activeTask.toggle(Helper.activeEditor.document.fileName, line);

    if (!isDirty) {
      Persist.saveTasks();
    }
    this.refresh();
    out('toggleMark');
  }

  public static filepath(path: string): string {
    log('filepath', '(path: ' + path + ')');
    const pathWithBasePath = this.basePath + path;
    const pwbExists = fs.existsSync(pathWithBasePath);
    if (pwbExists) {
      return pathWithBasePath;
    }
    const pExists = fs.existsSync(path);
    if (pExists) {
      return path;
    }
    return undefined;
  }

  public static changeActiveFile(editor: vscode.TextEditor) {
    ind('changeActiveFile');
    if (this._activeEditor === editor) {
      log('changeActiveFile', 'editor did not change');
      out('changeActiveFile');
      return;
    }
    this._activeEditor = editor;
    if (editor) {
      this._activeEditorLineCount = editor.document.lineCount;
      this._tasks.activeTask.use(editor.document.uri.fsPath);
      this.refresh();
    }
    out('changeActiveFile');
  }

  public static reducePath(filePath: string): string {
    if (filePath.startsWith(this._basePath)) {
      filePath = filePath.substring(this._basePath.length);
    }
    return filePath;
  }

  public static refresh() {
    if (!this._activeEditor || !this._tasks.activeTask.activeFile) {
      return;
    }

    let ranges: vscode.Range[] = [];

    const marks = this._tasks.activeTask.activeFile.marks;
    if (marks.length > 0) {
      for (let mark of marks) {
        let vscRange = new vscode.Range(mark, 0, mark, 0);
        ranges.push(vscRange);
      }

      this._activeEditor.setDecorations(this._vscTextEditorDecorationType, ranges);
    }
  }

  public static showLine(line: number) {
    let reviewType: vscode.TextEditorRevealType = vscode.TextEditorRevealType.InCenter;
    if (line === vscode.window.activeTextEditor.selection.active.line) {
      reviewType = vscode.TextEditorRevealType.InCenterIfOutsideViewport;
    }
    let vscSelection = new vscode.Selection(line, 0, line, 0);
    vscode.window.activeTextEditor.selection = vscSelection;
    vscode.window.activeTextEditor.revealRange(vscSelection, reviewType);
  }

  public static openAndShow(filepath: string, mark: number = undefined): void {
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
            this.showLine(this._tasks.activeTask.activeFile.marks[0]);
          }
        });
      }
    });
  }

  public static async getQuickPickItem(path: string, mark: number): Promise<vscode.QuickPickItem> {
    log('getQuickPickItem', '(path: ' + path + ', mark: ' + mark + ')');

    return new Promise<vscode.QuickPickItem>((resolve, reject) => {
      let filepath = Helper.filepath(path);
      log('getQuickPickItem', 'filepath === ' + filepath);
      if (!filepath) {
        reject('File not found! - ' + path);
      }

      let quickPickItem: vscode.QuickPickItem;

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
