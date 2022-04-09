import * as vscode from 'vscode';

import { PathHelper } from './PathHelper';

export class Mark {
  private _isDirty: boolean;
  private _label = '';
  private _lineNumber = -1;

  constructor(lineNumber: number, dirty = true) {
    this._isDirty = dirty;
    this.lineNumber = lineNumber;
  }

  get lineNumber(): number {
    return this._lineNumber;
  }

  set lineNumber(lineNumber: number) {
    this._isDirty = true;
    this._lineNumber = lineNumber;
  }

  unDirty() {
    if (this._isDirty) {
      this._isDirty = false;
    }
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
