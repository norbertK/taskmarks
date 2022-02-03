'use strict';

import * as vscode from 'vscode';

import { File } from './File';
import { PathHelper } from './PathHelper';

export class Mark {
  private _isDirty: boolean;
  private _parent: File;
  private _lineNumber: number;
  private _quickPickItem: vscode.QuickPickItem | undefined;
  private _dirtyLineNumber: number;
  private _dirtyQuickPickItem: vscode.QuickPickItem | undefined;

  public get quickPickItem(): vscode.QuickPickItem | undefined {
    if (this._isDirty) {
      return this._dirtyQuickPickItem;
    }
    return this._quickPickItem;
  }

  public get lineNumberForPersist(): number | undefined {
    return this._lineNumber;
  }

  public get lineNumber(): number {
    if (this._isDirty) {
      return this._dirtyLineNumber;
    }
    return this._lineNumber;
  }

  public set lineNumber(lineNumber: number) {
    this._isDirty = true;
    this.setLineNumber(lineNumber);
  }

  public constructor(parent: File, lineNumber: number, dirty = true) {
    this._isDirty = dirty;
    this._parent = parent;
    this._lineNumber = -1;
    this._dirtyLineNumber = -1;
    this.setLineNumber(lineNumber);
  }

  private setLineNumber(lineNumber: number) {
    if (this._isDirty) {
      this._dirtyLineNumber = lineNumber;
    } else {
      this._lineNumber = lineNumber;
    }

    this.getQuickPickItem(this._parent.filepath, lineNumber)
      .then((value) => {
        this._quickPickItem = value;
      })
      .catch((reason) => {
        // eslint-disable-next-line no-console
        console.log('error : ' + reason);
      });
  }

  public unDirty() {
    if (this._isDirty) {
      this._quickPickItem = this._dirtyQuickPickItem;
      this._dirtyQuickPickItem = undefined;

      this._lineNumber = this._dirtyLineNumber;
      this._dirtyLineNumber = -1;

      this._isDirty = false;
    }
  }

  public async getQuickPickItem(
    filepath: string,
    lineNumber: number
  ): Promise<vscode.QuickPickItem> {
    return new Promise<vscode.QuickPickItem>((resolve, reject) => {
      const fullPath = PathHelper.getFullPath(filepath);
      let quickPickItem: vscode.QuickPickItem;

      if (!fullPath) {
        reject('File not found! - ' + filepath);
        return;
      }
      if (lineNumber == null) {
        reject('Mark not set! - ' + filepath);
        return;
      }
      const uri: vscode.Uri = vscode.Uri.file(fullPath);
      vscode.workspace.openTextDocument(uri).then((doc) => {
        if (lineNumber <= doc.lineCount) {
          const lineText = doc.lineAt(lineNumber).text;
          quickPickItem = {
            label: lineNumber.toString(),
            description: lineText,
            detail: fullPath,
          };
          resolve(quickPickItem);
        }
      });
    });
  }

  public dumpToLog(indent: number): void {
    indent++;
    // eslint-disable-next-line no-console
    console.log(indent, '--------------------------');
    // eslint-disable-next-line no-console
    console.log(indent, '---------- Mark ----------');
    // eslint-disable-next-line no-console
    console.log(indent, '_isDirty            - ' + this._isDirty);
    if (this._isDirty) {
      // eslint-disable-next-line no-console
      console.log(
        indent,
        '_dirtyLineNumber    - ' +
          this._dirtyLineNumber +
          '(_lineNumber === ' +
          this._lineNumber +
          ')'
      );
      // eslint-disable-next-line no-console
      console.log(indent, '_dirtyQuickPickItem - ' + this._dirtyQuickPickItem);
    } else {
      // eslint-disable-next-line no-console
      console.log(indent, '_lineNumber         - ' + this._lineNumber);
      // eslint-disable-next-line no-console
      console.log(indent, '_quickPickItem      - ' + this._quickPickItem);
    }
    // eslint-disable-next-line no-console
    console.log(indent, '');
  }
}
