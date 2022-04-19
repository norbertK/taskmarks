import * as vscode from 'vscode';
import { PathHelper } from './PathHelper';

export abstract class DecoratorHelper {
  private static _iconPath: string;
  private static _vscTextEditorDecorationType: vscode.TextEditorDecorationType;

  static get iconPath(): string {
    return this._iconPath;
  }

  static initDecorator(context: vscode.ExtensionContext): void {
    this._iconPath = context.asAbsolutePath('images/bookmark.svg');
    this._vscTextEditorDecorationType =
      vscode.window.createTextEditorDecorationType({
        gutterIconPath: this._iconPath,
        overviewRulerLane: vscode.OverviewRulerLane.Full,
        overviewRulerColor: 'rgba(196, 196, 0, 0.8)',
      });
  }

  static refresh(activeEditor: vscode.TextEditor, lineNumbers: number[]): void {
    if (activeEditor === null) {
      return;
    }

    const ranges = lineNumbers.map((lineNumber) => {
      return new vscode.Range(lineNumber, 0, lineNumber, 0);
    });

    activeEditor.setDecorations(this._vscTextEditorDecorationType, ranges);
  }

  static showLine(line: number): void {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor === null || activeTextEditor === undefined) {
      return;
    }

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

  static openAndShow(filepath: string, lineNumber: number): void {
    vscode.workspace
      .openTextDocument(PathHelper.getFullPath(filepath))
      .then((textDocument) => {
        if (textDocument) {
          vscode.window.showTextDocument(textDocument).then(() => {
            this.showLine(lineNumber);
          });
        }
      });
  }
}
