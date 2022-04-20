import * as vscode from 'vscode';
import { PathHelper } from './PathHelper';
import { PathMarkX } from './types';

export class Mark implements PathMarkX {
  private _label = '';
  private _lineNumber = -1;
  private _filepath: string;

  private _quickPickItem: vscode.QuickPickItem | undefined;

  constructor(filepath: string, lineNumber: number, label = '') {
    this._label = label;
    this._lineNumber = lineNumber;
    this._filepath = filepath;

    this.getQuickPickI(filepath, lineNumber, label);
  }

  private async getQuickPickI(
    filepath: string,
    lineNumber: number,
    label: string
  ) {
    const fullPath = PathHelper.getFullPath(this._filepath);

    const uri = vscode.Uri.file(fullPath);
    vscode.workspace.openTextDocument(uri).then((doc) => {
      if (doc === undefined) {
        throw new Error(
          `Mark.getQuickPickItem() - vscode.workspace.openTextDocument(${uri}) should not be undefined`
        );
      }
      if (lineNumber <= doc.lineCount) {
        const lineText = doc.lineAt(lineNumber).text;
        const quickPickItem: vscode.QuickPickItem = {
          label: lineNumber.toString(),
          description: label ? label : lineText,
          detail: filepath,
        };
        this._quickPickItem = quickPickItem;
      }
    });
  }

  public get quickPickItem(): vscode.QuickPickItem | undefined {
    return this._quickPickItem;
  }

  get filepath(): string {
    return this._filepath;
  }

  get label(): string {
    return this._label;
  }

  get lineNumber(): number {
    return this._lineNumber;
  }

  set lineNumber(lineNumber: number) {
    this._lineNumber = lineNumber;
  }
}
