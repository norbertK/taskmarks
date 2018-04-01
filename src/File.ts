'use strict';

import * as _ from 'lodash';

import { Mark } from './Mark';
import { DebLog } from './DebLog';

export class File extends DebLog {
  private _filepath: string;
  private _marks: Array<Mark> = [];

  public get filepath(): string {
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

  constructor(filePath: string, lineNumber: number) {
    super();
    this.className = 'File';
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
    this.ind('mergeWith', 'with file.filepath === ' + file.filepath + ' and marks: ' + file.marks);
    this.log('mergeWith', 'existing marks are: ' + this.marks);
    this.log('mergeWith', 'marks to include are: ' + file.marks);

    let diff = _.difference(file.marks, this.marks);
    this.log('mergeWith', 'diff is :');
    diff.forEach(mark => {
      this.log('mergeWith', mark + '');
      this.addMark(mark);
    });

    this.out();
    return this;
  }

  public setMarksFromPersist(marks: Array<number>) {
    marks.forEach(async mark => {
      this.addMark(mark);
    });
  }

  public addMark(mark: number) {
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

  public dumpToLog(indent: number): void {
    indent++;
    this.dump(indent, '--------------------------');
    this.dump(indent, '---------- File ----------');
    this.dump(indent, '_filepath - ' + this._filepath);
    let marks = '';
    this._marks.forEach(mark => {
      // mark.dumpToLog(indent);
      marks += mark.lineNumber + ' ';
    });
    this.dump(indent, marks);
    this.dump(indent, '');
  }
}
