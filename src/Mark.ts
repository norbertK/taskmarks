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
      .catch((reason) => console.log('error : ' + reason));
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
    mark: number
  ): Promise<vscode.QuickPickItem> {
    return new Promise<vscode.QuickPickItem>((resolve, reject) => {
      const fullPath = PathHelper.getFullPath(filepath);
      let quickPickItem: vscode.QuickPickItem;

      if (!fullPath) {
        reject('File not found! - ' + filepath);
        return;
      }
      if (!mark) {
        reject('Mark not set! - ' + filepath);
        return;
      }
      const uri: vscode.Uri = vscode.Uri.file(fullPath);
      vscode.workspace.openTextDocument(uri).then((doc) => {
        if (mark <= doc.lineCount) {
          const lineText = doc.lineAt(mark).text;
          quickPickItem = {
            label: mark.toString(),
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
    console.log(indent, '--------------------------');
    console.log(indent, '---------- Mark ----------');
    console.log(indent, '_isDirty            - ' + this._isDirty);
    if (this._isDirty) {
      console.log(
        indent,
        '_dirtyLineNumber    - ' +
          this._dirtyLineNumber +
          '(_lineNumber === ' +
          this._lineNumber +
          ')'
      );
      console.log(indent, '_dirtyQuickPickItem - ' + this._dirtyQuickPickItem);
    } else {
      console.log(indent, '_lineNumber         - ' + this._lineNumber);
      console.log(indent, '_quickPickItem      - ' + this._quickPickItem);
    }
    console.log(indent, '');
  }
}
