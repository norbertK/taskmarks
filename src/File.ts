// import * as _ from 'lodash';
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
    const lineNumbers: number[] = [];
    this._marks.forEach((mark) => {
      if (mark.lineNumber !== undefined) {
        lineNumbers.push(mark.lineNumber);
      }
    });

    return lineNumbers;
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

  mergeMarksAndLineNumbers(persistFile: IPersistFile): File {
    // start with an empty array
    const newMarks: Mark[] = [];
    // copy all old, but check for doubles
    if (this._marks.length > 0) {
      this._marks.forEach((mark) => {
        const pos = newMarks.findIndex(
          (newMark) => mark.lineNumber === newMark.lineNumber
        );
        if (pos === -1) {
          newMarks.push(mark);
        }
      });
    }

    // now do the same with file.lineNumbers
    if (persistFile.lineNumbers.length > 0) {
      persistFile.lineNumbers.forEach((lineNumber) => {
        const pos = newMarks.findIndex(
          (newMark) => lineNumber === newMark.lineNumber
        );
        if (pos === -1) {
          newMarks.push(new Mark(this, lineNumber, false));
        }
      });
    }

    // replace old _marks array with newMarks
    this._marks = newMarks;

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

  // addMark(mark: Mark): void {
  //   this._marks.push(mark);
  // }

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
