import * as vscode from 'vscode';
import type { IPersistFile, PathMarkX } from './types';
import { Mark } from './Mark';

export class File {
  private _filepath: string;
  private _marks: Mark[] = [];

  get filepath(): string {
    return this._filepath;
  }

  get allMarks(): PathMarkX[] {
    return this._marks.map((mark) => {
      return {
        filepath: mark.filepath,
        lineNumber: mark.lineNumber,
      };
    });
  }

  get quickPickItems(): vscode.QuickPickItem[] {
    const quickPickItems: vscode.QuickPickItem[] = [];
    this._marks.forEach((mark) => {
      if (mark.quickPickItem !== undefined) {
        quickPickItems.push(mark.quickPickItem);
      }
    });
    return quickPickItems;
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
          newMarks.push(new Mark(this._filepath, lineNumber));
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

  hasMarks(): boolean {
    return this._marks.length > 0;
  }
}
