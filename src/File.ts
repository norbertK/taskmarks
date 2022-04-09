import type { IPersistFile, PathMark } from './types';
import { Mark } from './Mark';

export class File {
  private _filepath: string;
  private _marks: Mark[] = [];

  get filepath(): string {
    return this._filepath;
  }

  get allMarks(): PathMark[] {
    return this._marks.map((mark) => {
      return {
        fullPath: this.filepath,
        lineNumber: mark.lineNumber,
      };
    });
  }

  get lineNumbers(): number[] {
    const lineNumbers: number[] = [];
    this._marks.forEach((mark) => {
      lineNumbers.push(mark.lineNumber);
    });

    return lineNumbers;
  }

  constructor(filePath: string, lineNumber = -1) {
    this._filepath = filePath;
    this._marks = [];
    if (lineNumber === -1) {
      return;
    }
    this.toggleTaskMark(lineNumber);
  }

  isDirty(): boolean {
    this._marks.forEach((mark) => {
      if (mark.isDirty()) {
        return true;
      }
    });

    return false;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  mergeMarksAnd_PersistFile_(persistFile: IPersistFile): File {
    if (persistFile === undefined || persistFile.lineNumbers === undefined) {
      return this.mergeMarksAndLineNumbers([]);
    }
    return this.mergeMarksAndLineNumbers(persistFile.lineNumbers);
  }

  mergeMarksAndLineNumbers(lineNumbers: number[]): File {
    // start with an empty array
    const newMarks: Mark[] = [];

    // first remove double marks in this._marks
    // copy all old, but check for doubles
    if (this._marks && this._marks.length > 0) {
      this._marks.forEach((mark) => {
        const pos = newMarks.findIndex(
          (newMark) => mark.lineNumber === newMark.lineNumber
        );
        if (pos === -1) {
          newMarks.push(mark);
        }
      });
    }

    // now insert the new lineNumbers
    if (lineNumbers.length > 0) {
      lineNumbers.forEach((lineNumber) => {
        const pos = newMarks.findIndex(
          (newMark) => lineNumber === newMark.lineNumber
        );
        if (pos === -1) {
          newMarks.push(new Mark(lineNumber, false));
        }
      });
    }
    // sort
    let sortedMarks = newMarks.sort(
      (first, second) => 0 - (first.lineNumber > second.lineNumber ? -1 : 1)
    );

    // replace old _marks array with sortedMarks
    this._marks = sortedMarks;

    return this;
  }

  addMark(lineNumber: number): void {
    this.mergeMarksAndLineNumbers([lineNumber]);
  }

  toggleTaskMark(lineNumber: number): void {
    const index = this._marks.findIndex(
      (mark) => mark.lineNumber === lineNumber
    );
    if (index > -1) {
      this._marks.splice(index, 1);
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
}
