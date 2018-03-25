'use strict';

import { File } from './File';
import { ITask } from './Models';
import { Helper } from './Helper';
import { Mark } from './Mark';
import { Ring } from './Ring';

import { debLog, debIn, debOut } from './DebLog';
const className = 'Task';
function ind(methodName: string, text = '') {
  debIn(className, methodName, text);
}
function out(methodName: string, text = '') {
  debOut(className, methodName, text);
}
function log(methodName: string, text = '') {
  debLog(className, methodName, text);
}

export class Task implements ITask {
  private _name: string;
  private _activeFile: File;
  private _files: Ring<File>;

  constructor(name: string) {
    this._name = name;
    this._files = new Ring();
  }

  public get name(): string {
    return this._name;
  }

  public get activeFileName(): string {
    return this._activeFile.filepath;
  }

  public get activeFile(): File {
    return this._activeFile;
  }

  public set activeFile(file: File) {
    this._activeFile = file;
  }

  public get files(): Ring<File> {
    return this._files;
  }

  public get allMarks(): Array<Mark> {
    ind('allMarks');
    let marks: Array<Mark> = [];

    this._files.forEach(file => {
      log('allMarks', 'file: ' + file.filepath + ' with ' + file.allMarks.length + ' marks');
      marks.push(...file.allMarks);
    });
    log('allMarks', 'found ' + marks.length + ' marks for this task (' + this._name + ')');
    out('allMarks');
    return marks;
  }

  public toggle(path: string, lineNumber: number): boolean {
    const filePath = Helper.reducePath(path);

    let file: File = this._files.find(fm => fm.filepath === filePath);

    if (file) {
      const hasMarks = file.toggleTask(lineNumber);
    } else {
      file = new File(filePath, lineNumber);
      this._files.push(file);
    }

    return file.hasMarks();
  }

  public use(path: string): File {
    const filePath = Helper.reducePath(path);
    log('use', 'filePath === ' + filePath);

    let file: File = this.getFile(filePath);

    if (!file) {
      file = new File(filePath, -1);
      this._files.push(file);
    }

    this.activeFile = file;

    return file;
  }

  public getFile(reducedFilePath: string): File {
    let fileMark: File = this._files.find(fm => fm.filepath === reducedFilePath);

    return fileMark;
  }
}
