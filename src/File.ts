import * as vscode from 'vscode';
import type { IPersistFile, IPersistMark, PathMark } from './types';
import { Mark } from './Mark';

export class File {
  private _filepath: string;
  private _marks: Mark[] = [];

  get filepath(): string {
    return this._filepath;
  }

  get marks(): Mark[] {
    return this._marks;
  }

  get allPersistMarks(): IPersistMark[] {
    return this._marks.map((mark) => {
      return {
        lineNumber: mark.lineNumber,
        label: mark.label,
      };
    });
  }

  get allPathMarks(): PathMark[] {
    return this._marks.map((mark) => {
      return {
        filepath: mark.filepath,
        lineNumber: mark.lineNumber,
        label: mark.label,
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

  constructor(filePath: string, lineNumber = -1, label = '') {
    this._filepath = filePath;
    this._marks = [];
    if (lineNumber === -1) {
      return;
    }
    this.toggleTaskMark({ lineNumber, label });
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  mergeMarksAnd_PersistFile_(persistFile: IPersistFile): File {
    if (persistFile === undefined || persistFile.persistMarks === undefined) {
      return this.mergeMarksAndLineNumbers([]);
    }
    return this.mergeMarksAndLineNumbers(persistFile.persistMarks);
  }

  mergeMarksAndLineNumbers(persistMarks: IPersistMark[]): File {
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
    if (persistMarks.length > 0) {
      persistMarks.forEach((lineNumbersAndLabel) => {
        const pos = newMarks.findIndex(
          (newMark) => lineNumbersAndLabel.lineNumber === newMark.lineNumber
        );
        if (pos === -1) {
          newMarks.push(
            new Mark(
              this._filepath,
              lineNumbersAndLabel.lineNumber,
              lineNumbersAndLabel.label
            )
          );
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

  addMark(lineNumbersAndLabel: { lineNumber: number; label: string }): void {
    this.mergeMarksAndLineNumbers([lineNumbersAndLabel]);
  }

  hasMark(lineNumber: number): boolean {
    const index = this._marks.findIndex(
      (mark) => mark.lineNumber === lineNumber
    );
    if (index > -1) {
      return true;
    }
    return false;
  }

  toggleTaskMark(persistMark: IPersistMark): void {
    const index = this._marks.findIndex(
      (mark) => mark.lineNumber === persistMark.lineNumber
    );
    if (index > -1) {
      this._marks.splice(index, 1);
    } else {
      this.addMark(persistMark);
    }
  }

  get hasMarks(): boolean {
    return this._marks.length > 0;
  }
}
