'use strict';

import * as vscode from 'vscode';
import * as _ from 'lodash';

import { Helper } from './Helper';
import { File } from './File';

import { debLog, debIn, debOut, debBackFrom } from './DebLog';

const className = 'Mark';
function ind(methodName: string, text = '') {
  debIn(className, methodName, text);
}
function out(methodName: string, text = '') {
  debOut(className, methodName, text);
}
function log(methodName: string, text = ''): number {
  return debLog(className, methodName, text);
}
function backFrom(count: number, methodName: string, text = '') {
  debBackFrom(count, className, methodName, text);
}

export class Mark {
  private _isDirty: boolean;
  private _parent: File;
  private _lineNumber: number;
  private _quickPickItem: vscode.QuickPickItem;
  private _dirtyLineNumber: number;
  private _dirtyQuickPickItem: vscode.QuickPickItem;

  public get quickPickItem(): vscode.QuickPickItem {
    if (this._isDirty) {
      return this._dirtyQuickPickItem;
    }
    return this._quickPickItem;
  }

  public get lineNumberForPersist(): number {
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
    this.setLineNumber(lineNumber);
  }

  private setLineNumber(lineNumber: number) {
    if (this._isDirty) {
      this._dirtyLineNumber = lineNumber;
    } else {
      this._lineNumber = lineNumber;
    }

    let debCount = log('lineNumber', 'call Helper.getQuickPickItem(...)');
    Helper.getQuickPickItem(this._parent.filepath, lineNumber)
      .then(value => {
        this._quickPickItem = value;
      })
      .catch(reason => console.log('error : ' + reason));
  }

  public unDirty() {
    if (this._isDirty) {
      this._quickPickItem = this._dirtyQuickPickItem;
      this._dirtyQuickPickItem = undefined;

      this._lineNumber = this._dirtyLineNumber;
      this._dirtyLineNumber = undefined;

      this._isDirty = false;
    }
  }
}
