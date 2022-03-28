import * as _ from 'lodash';
import type { IPersistFile } from './types';

import { Mark } from './Mark';

export class File {
  private _filepath: string;
  private _marks: Mark[] = [];

  get filepath(): string {
    return this._filepath;
  }

  get allMarks(): Mark[] {
    return this._marks;
  }

  get lineNumbers(): number[] {
    const marks: number[] = [];
    this._marks.forEach((mark) => {
      if (mark.lineNumber !== undefined) {
        marks.push(mark.lineNumber);
      }
    });

    return marks;
  }

  get lineNumbersForPersist(): number[] {
    const marks: number[] = [];
    this._marks.forEach((mark) => {
      if (mark.lineNumberForPersist !== undefined) {
        marks.push(mark.lineNumberForPersist);
      }
    });

    return marks;
  }

  constructor(filePath: string, lineNumber = -1) {
    this._filepath = filePath;

    if (!this._marks) {
      this._marks = [];
    }
    if (lineNumber === -1) {
      return;
    }
    this.toggleTaskMark(lineNumber);
  }

  mergeWith(file: IPersistFile): File {
    const diff = _.difference(file.marks, this.lineNumbers);
    diff.forEach((mark) => {
      this.addMark(mark);
    });

    return this;
  }

  setMarksFromPersist(lineNumbers: number[]): void {
    lineNumbers.forEach(async (lineNumber) => {
      this.addMark(lineNumber);
    });
  }

  addMark(lineNumber: number): void {
    this._marks.push(new Mark(this, lineNumber, false));
  }

  toggleTaskMark(lineNumber: number): void {
    const found = this._marks.findIndex(
      (mark) => mark.lineNumber === lineNumber
    );

    if (found > -1) {
      this._marks.splice(found, 1);
    } else {
      this.addMark(lineNumber);
    }
  }

  unDirtyAll(): void {
    this._marks.forEach((mark) => mark.unDirty());
  }

  hasMarks(): boolean {
    return this._marks.length > 0;
  }

  // dumpToLog(indent: number): void {
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
