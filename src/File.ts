'use strict';

import * as _ from 'lodash';

import { Mark } from './Mark';

import { debLog, debIn, debOut, debBackFrom } from './DebLog';
const className = 'File';
function ind(methodName: string, text = '') {
  debIn(className, methodName, text);
}
function out(methodName: string, text = '') {
  debOut(className, methodName, text);
}
// function log(methodName: string, text = '') {
//   debLog(className, methodName, text);
// }
// function backFrom(count: number, methodName: string, text = '') {
//   debBackFrom(count, className, methodName, text);
// }

export class File {
  private _filepath: string | undefined;
  private _marks: Array<Mark> = [];

  public get filepath(): string | undefined {
    return this._filepath;
  }

  public get allMarks(): Array<Mark> {
    return this._marks;
  }

  public get marks(): Array<number> {
    const marks: number[] = [];
    this._marks.forEach(mark => {
      if (mark.lineNumber !== undefined) {
        marks.push(mark.lineNumber);
      }
    });

    return marks;
  }

  public get marksForPersist(): Array<number> {
    const marks: number[] = [];
    this._marks.forEach(mark => {
      if (mark.lineNumberForPersist !== undefined) {
        marks.push(mark.lineNumberForPersist);
      }
    });

    return marks;
  }

  constructor(filePath: string | undefined, lineNumber: number) {
    this.initFile(filePath, lineNumber);
  }

  private initFile(filePath: string | undefined, lineNumber: number) {
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

  public mergeWith(file: File): File {
    ind('mergeWith', 'with file.filepath === ' + file.filepath + ' and marks: ' + file.marks);
    let diff = _.difference(file._marks, this._marks);
    this._marks.push(...diff);
    out('mergeWith', 'with file.filepath === ' + file.filepath);
    return this;
  }

  public setMarksFromPersist(marks: Array<number>) {
    marks.forEach(async mark => {
      this.addMark(mark);
    });
  }

  private addMark(mark: number) {
    this._marks.push(new Mark(this, mark, false));
  }

  public toggleTask(lineNumber: number): boolean {
    const mark: Mark | undefined = _.find(this._marks, (mark: Mark) => mark.lineNumber === lineNumber);

    if (mark) {
      _.remove(this._marks, (mark: Mark) => mark.lineNumber === lineNumber);
    } else {
      this.addMark(lineNumber);
    }

    return this.hasMarks();
  }

  public unDirty(): void {
    this._marks.forEach(mark => mark.unDirty());
  }

  public hasMarks(): boolean {
    return this._marks.length > 0;
  }
}
