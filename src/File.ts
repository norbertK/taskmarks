'use strict';

import * as _ from 'lodash';
import type { IPersistFile } from './types';

import { Mark } from './Mark';

export class File {
  private _filepath: string;
  private _marks: Mark[] = [];

  public get filepath(): string {
    return this._filepath;
  }

  public get allMarks(): Mark[] {
    return this._marks;
  }

  public get marks(): number[] {
    const marks: number[] = [];
    this._marks.forEach((mark) => {
      if (mark.lineNumber !== undefined) {
        marks.push(mark.lineNumber);
      }
    });

    return marks;
  }

  public get marksForPersist(): number[] {
    const marks: number[] = [];
    this._marks.forEach((mark) => {
      if (mark.lineNumberForPersist !== undefined) {
        marks.push(mark.lineNumberForPersist);
      }
    });

    return marks;
  }

  constructor(filePath: string, lineNumber: number) {
    this._filepath = filePath;

    if (!this._marks) {
      this._marks = [];
    }
    if (lineNumber === -1) {
      return;
    }
    this.toggleTask(lineNumber);
  }

  public mergeWith(file: IPersistFile): File {
    const diff = _.difference(file.marks, this.marks);
    diff.forEach((mark) => {
      this.addMark(mark);
    });

    return this;
  }

  public setMarksFromPersist(marks: number[]) {
    marks.forEach(async (mark) => {
      this.addMark(mark);
    });
  }

  public addMark(mark: number) {
    this._marks.push(new Mark(this, mark, false));
  }

  public toggleTask(lineNumber: number): boolean {
    const found = this._marks.findIndex((m) => m.lineNumber === lineNumber);

    if (found > -1) {
      this._marks.splice(found, 1);
    } else {
      this.addMark(lineNumber);
    }

    return this.hasMarks();
  }

  public unDirty(): void {
    this._marks.forEach((mark) => mark.unDirty());
  }

  public hasMarks(): boolean {
    return this._marks.length > 0;
  }

  // public dumpToLog(indent: number): void {
  //   indent++;
  //   // eslint-disable-next-line no-console
  //   console.log(indent, '--------------------------');
  //   // eslint-disable-next-line no-console
  //   console.log(indent, '---------- File ----------');
  //   // eslint-disable-next-line no-console
  //   console.log(indent, '_filepath - ' + this._filepath);
  //   let marks = '';
  //   this._marks.forEach((mark) => {
  //     // mark.dumpToLog(indent);
  //     marks += mark.lineNumber + ' ';
  //   });
  //   // eslint-disable-next-line no-console
  //   console.log(indent, marks);
  //   // eslint-disable-next-line no-console
  //   console.log(indent, '');
  // }
}
