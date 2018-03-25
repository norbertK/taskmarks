'use strict';

import * as _ from 'lodash';

import { Mark } from './Mark';

import { debLog, debIn, debOut } from './DebLog';
const className = 'File';
function ind(methodName: string, text = '') {
  debIn(className, methodName, text);
}
function out(methodName: string, text = '') {
  debOut(className, methodName, text);
}
function log(methodName: string, text = '') {
  debLog(className, methodName, text);
}

export class File {
  private _filepath: string;
  private _marks: Array<Mark>;

  public get filepath(): string {
    return this._filepath;
  }

  public get allMarks(): Array<Mark> {
    return this._marks;
  }

  public get marks(): Array<number> {
    const marks: number[] = this._marks.map(mark => mark.lineNumber);

    return marks;
  }

  public get marksForPersist(): Array<number> {
    const marks: number[] = this._marks.map(mark => mark.lineNumberForPersist);

    return marks;
  }

  constructor(filePath: string, lineNumber: number) {
    this.initFile(filePath, lineNumber);
  }

  private initFile(filePath: string, lineNumber: number) {
    log('initFile', '(filePath: ' + filePath + ', lineNumber: ' + lineNumber + ')');

    if (!this._filepath) {
      this._filepath = filePath;
    }
    if (!this._marks) {
      this._marks = [];
    }
    if (this._filepath !== filePath) {
      return;
    }
    if (lineNumber === -1) {
      return;
    }
    this.toggleTask(lineNumber);
  }

  public setMarksFromPersist(marks: Array<number>) {
    ind('setMarksFromPersist');
    marks.forEach(async mark => {
      this.addMark(mark);
    });
    out('setMarksFromPersist');
  }

  private addMark(mark: number) {
    ind('addMark', '(' + mark + ')');
    this._marks.push(new Mark(this, mark, false));
    out('addMark', '(' + mark + ')');
  }

  public toggleTask(lineNumber: number): boolean {
    log('toggleTask', '(' + lineNumber + ')');

    const mark: Mark = _.find(this._marks, mark => mark.lineNumber === lineNumber);
    log('toggleTask', 'mark === ' + mark);

    if (mark) {
      _.remove(this._marks, mark => mark.lineNumber === lineNumber);
    } else {
      this.addMark(lineNumber);
    }

    return this.hasMarks();
  }

  public unDirty(): void {
    this._marks.forEach(mark => mark.unDirty());
  }

  public  hasMarks(): boolean {
    return this._marks.length > 0;
  }
}
