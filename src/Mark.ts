import * as vscode from 'vscode';

import { File } from './File';
import { PathHelper } from './PathHelper';

export class Mark {
  private _isDirty: boolean;
  private _parent: File;
  private _label = '';
  private _lineNumber: number;
  private _quickPickItem: vscode.QuickPickItem | undefined;

  // ToDoNK ????
  private _dirtyLineNumber: number;
  private _dirtyQuickPickItem: vscode.QuickPickItem | undefined;

  constructor(parent: File, lineNumber: number, dirty = true) {
    this._isDirty = dirty;
    this._parent = parent;
    this._lineNumber = -1;
    this._dirtyLineNumber = -1;
    this.setLineNumber(lineNumber);
  }

  get quickPickItem(): vscode.QuickPickItem | undefined {
    if (this._isDirty) {
      return this._dirtyQuickPickItem;
    }
    return this._quickPickItem;
  }

  get lineNumberForPersist(): number | undefined {
    return this._lineNumber;
  }

  get lineNumber(): number {
    if (this._isDirty) {
      return this._dirtyLineNumber;
    }
    return this._lineNumber;
  }

  set lineNumber(lineNumber: number) {
    this._isDirty = true;
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

  unDirty() {
    if (this._isDirty) {
      this._quickPickItem = this._dirtyQuickPickItem;
      this._dirtyQuickPickItem = undefined;

      this._lineNumber = this._dirtyLineNumber;
      this._dirtyLineNumber = -1;

      this._isDirty = false;
    }
  }

  async getQuickPickItem(
    filepath: string,
    lineNumber: number | null
  ): Promise<vscode.QuickPickItem> {
    if (lineNumber == null) {
      throw new Error(`Mark not set! - ${filepath}`);
    }

    return new Promise<vscode.QuickPickItem>((res) => {
      const fullPath = PathHelper.getFullPath(filepath);
      if (fullPath == null) {
        throw new Error(`File not found! - ${filepath}`);
      }
      const uri = vscode.Uri.file(fullPath);

      vscode.workspace.openTextDocument(uri).then((doc) => {
        if (lineNumber <= doc.lineCount) {
          const lineText = doc.lineAt(lineNumber).text;
          const quickPickItem: vscode.QuickPickItem = {
            label: lineNumber.toString(),
            description: this._label ? this._label : lineText,
            detail: fullPath,
          };
          res(quickPickItem);
        }
      });
    });
  }

  // dumpToLog(indent: number): void {
  //   indent++;
  //   // eslint-disable-next-line no-console
  //   console.log(indent, '--------------------------');
  //   // eslint-disable-next-line no-console
  //   console.log(indent, '---------- Mark ----------');
  //   // eslint-disable-next-line no-console
  //   console.log(indent, '_isDirty            - ' + this._isDirty);
  //   if (this._isDirty) {
  //     // eslint-disable-next-line no-console
  //     console.log(
  //       indent,
  //       '_dirtyLineNumber    - ' +
  //         this._dirtyLineNumber +
  //         '(_lineNumber === ' +
  //         this._lineNumber +
  //         ')'
  //     );
  //     // eslint-disable-next-line no-console
  //     console.log(indent, '_dirtyQuickPickItem - ' + this._dirtyQuickPickItem);
  //   } else {
  //     // eslint-disable-next-line no-console
  //     console.log(indent, '_lineNumber         - ' + this._lineNumber);
  //     // eslint-disable-next-line no-console
  //     console.log(indent, '_quickPickItem      - ' + this._quickPickItem);
  //   }
  //   // eslint-disable-next-line no-console
  //   console.log(indent, '');
  // }
}
