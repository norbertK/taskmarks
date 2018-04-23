'use strict';

import * as vscode from 'vscode';
import { PathHelper } from './PathHelper';

export class DecoratorHelper {
  private static _iconPath: string;
  private static _vscTextEditorDecorationType: vscode.TextEditorDecorationType;

  public static get iconPath() {
    return this._iconPath;
  }

  public static initDecorator(context: vscode.ExtensionContext) {
    this._iconPath = context.asAbsolutePath('images/bookmark.svg');
    this._vscTextEditorDecorationType = vscode.window.createTextEditorDecorationType({
      gutterIconPath: this._iconPath,
      overviewRulerLane: vscode.OverviewRulerLane.Full,
      overviewRulerColor: 'rgba(196, 196, 0, 0.8)'
    });
  }

  public static refresh(activeEditor: vscode.TextEditor, marks: Array<number>) {
    if (!activeEditor) {
      return;
    }
    let ranges: vscode.Range[] = [];

    for (let mark of marks) {
      let vscRange = new vscode.Range(mark, 0, mark, 0);
      ranges.push(vscRange);
    }

    activeEditor.setDecorations(this._vscTextEditorDecorationType, ranges);
  }

  public static showLine(line: number) {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }
    let textEditorRevealType: vscode.TextEditorRevealType = vscode.TextEditorRevealType.InCenter;
    if (line === activeTextEditor.selection.active.line) {
      textEditorRevealType = vscode.TextEditorRevealType.InCenterIfOutsideViewport;
    }
    let selection = new vscode.Selection(line, 0, line, 0);
    activeTextEditor.selection = selection;
    activeTextEditor.revealRange(selection, textEditorRevealType);
  }

  public static openAndShow(filepath: string, mark: number): void {
    const fullPath = PathHelper.getFullPath(filepath);
    if (!fullPath) {
      return;
    }

    vscode.workspace.openTextDocument(fullPath).then(textDocument => {
      if (textDocument) {
        vscode.window.showTextDocument(textDocument).then(editor => {
          if (!mark) {
            return;
          }
          this.showLine(mark);
        });
      }
    });
  }
}
