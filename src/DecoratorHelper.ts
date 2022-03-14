import * as vscode from 'vscode';
import { PathHelper } from './PathHelper';

export class DecoratorHelper {
  private static _iconPath: string;
  private static _vscTextEditorDecorationType: vscode.TextEditorDecorationType;

  static get iconPath() {
    return this._iconPath;
  }

  static initDecorator(context: vscode.ExtensionContext) {
    this._iconPath = context.asAbsolutePath('images/bookmark.svg');
    this._vscTextEditorDecorationType =
      vscode.window.createTextEditorDecorationType({
        gutterIconPath: this._iconPath,
        overviewRulerLane: vscode.OverviewRulerLane.Full,
        overviewRulerColor: 'rgba(196, 196, 0, 0.8)',
      });
  }

  static refresh(activeEditor: vscode.TextEditor, marks: number[]) {
    if (activeEditor == null) return;

    const ranges = marks.map((mark) => {
      return new vscode.Range(mark, 0, mark, 0);
    });

    activeEditor.setDecorations(this._vscTextEditorDecorationType, ranges);
  }

  static showLine(line: number) {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor == null) return;

    let textEditorRevealType: vscode.TextEditorRevealType =
      vscode.TextEditorRevealType.InCenter;

    if (line === activeTextEditor.selection.active.line) {
      textEditorRevealType =
        vscode.TextEditorRevealType.InCenterIfOutsideViewport;
    }

    const selection = new vscode.Selection(line, 0, line, 0);
    activeTextEditor.selection = selection;
    activeTextEditor.revealRange(selection, textEditorRevealType);
  }

  static openAndShow(filepath: string, mark: number): void {
    const fullPath = PathHelper.getFullPath(filepath);
    if (!fullPath) {
      return;
    }

    vscode.workspace.openTextDocument(fullPath).then((textDocument) => {
      if (textDocument) {
        vscode.window.showTextDocument(textDocument).then(() => {
          if (!mark) {
            return;
          }
          this.showLine(mark);
        });
      }
    });
  }
}
