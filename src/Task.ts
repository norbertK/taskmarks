'use strict';

import { File } from './File';
import { ITask } from './Models';
import { Helper } from './Helper';
import { Mark } from './Mark';
import { Ring } from './Ring';

import { debLog, debIn, debOut, debBackFrom } from './DebLog';
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
// function backFrom(count: number, methodName: string, text = '') {
//   debBackFrom(count, className, methodName, text);
// }

export class Task implements ITask {
  private _name: string;
  private _activeFile: File | undefined;
  private _files: Ring<File>;

  constructor(name: string) {
    this._name = name;
    this._files = new Ring();
  }

  public get name(): string {
    return this._name;
  }

  public get activeFileName(): string | undefined {
    if (this._activeFile) {
      return this._activeFile.filepath;
    }
    return undefined;
  }

  public get activeFile(): File | undefined {
    return this._activeFile;
  }

  public set activeFile(file: File | undefined) {
    this._activeFile = file;
  }

  public get files(): Ring<File> {
    return this._files;
  }

  public get allMarks(): Array<Mark> {
    let marks: Array<Mark> = [];

    this._files.forEach(file => {
      marks.push(...file.allMarks);
    });
    return marks;
  }

  public mergeWith(taskToMerge: Task): Task {
    ind('mergeWith', 'with taskToMerge.name === ' + taskToMerge.name);
    let filesToAdd: Array<File> = [];

    taskToMerge._files.forEach(fileToMerge => {
      log('mergeWith', 'look for file  fileToMerge.filepath === ' + fileToMerge.filepath);
      let file: File | undefined = this._files.find(fm => fm.filepath === fileToMerge.filepath);

      if (file) {
        log('mergeWith', 'file found');
        file.mergeWith(fileToMerge);
      } else {
        log('mergeWith', 'file not found');
        filesToAdd.push(fileToMerge);
      }
    });
    filesToAdd.forEach(fileToAdd => {
      this.files.push(fileToAdd);
    });
    out('mergeWith', 'with taskToMerge.name === ' + taskToMerge.name);
    return this;
  }

  public toggle(path: string, lineNumber: number): boolean {
    const filePath = Helper.reducePath(path);

    let file: File | undefined = this._files.find(fm => fm.filepath === filePath);

    if (file) {
      file.toggleTask(lineNumber);
    } else {
      file = new File(filePath, lineNumber);
      this._files.push(file);
    }

    return file.hasMarks();
  }

  public use(path: string): File {
    const filePath = Helper.reducePath(path);

    let file: File | undefined = this.getFile(filePath);

    if (!file) {
      file = new File(filePath, -1);
      this._files.push(file);
    }

    this.activeFile = file;

    return file;
  }

  public getFile(reducedFilePath: string): File | undefined {
    let fileMark: File | undefined = this._files.find(fm => fm.filepath === reducedFilePath);

    return fileMark;
  }
}
