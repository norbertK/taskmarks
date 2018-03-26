'use strict';

import * as _ from 'lodash';

import { Mark } from './Mark';

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
