'use strict';

import { File } from './File';
import { Mark } from './Mark';
import { Ring } from './Ring';
import { DebLog } from './DebLog';
import { PathHelper } from './PathHelper';

export class Task extends DebLog {
  private _name: string;
  private _activeFile: File | undefined;
  private _files: Ring<File>;

  constructor(name: string) {
    super();
    this.className = 'Task';
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

  public mergeWith(taskToMerge: IPersistTask): Task {
    this.ind('mergeWith', 'with taskToMerge.name === ' + taskToMerge.name);
    let filesToAdd: Array<IPersistFile> = [];

    taskToMerge.files.forEach(fileToMerge => {
      this.log('mergeWith', 'look for file  fileToMerge.filepath === ' + fileToMerge.filepath);
      let file: File | undefined = this._files.find(fm => fm.filepath === fileToMerge.filepath);

      if (file) {
        this.log('mergeWith', 'file ' + fileToMerge.filepath + ' found');
        file.mergeWith(fileToMerge);
      } else {
        this.log('mergeWith', 'file ' + fileToMerge.filepath + ' not found');
        filesToAdd.push(fileToMerge);
      }
    });
    filesToAdd.forEach(fileToAdd => {
      let file = this.use(fileToAdd.filepath);
      fileToAdd.marks.forEach(mark => file.addMark(mark));
    });
    this.out();
    return this;
  }

  public toggle(path: string, lineNumber: number): boolean {
    this.ind('toggle', 'with path === ' + path + ' and lineNumber === ' + lineNumber);
    const reducedPath = PathHelper.reducePath(path);
    this.log('toggle', 'reducedPath === ' + reducedPath);

    let file: File | undefined = this._files.find(fm => fm.filepath === reducedPath);

    if (file) {
      this.log('toggle', 'found file with ' + reducedPath);
      file.toggleTask(lineNumber);
    } else {
      file = new File(reducedPath, lineNumber);
      this._files.push(file);
    }

    this.out();
    return file.hasMarks();
  }

  public use(path: string): File {
    const filePath = PathHelper.reducePath(path);

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

  public dumpToLog(indent: number): void {
    indent++;
    this.dump(indent, '--------------------------');
    this.dump(indent, '---------- Task ----------');
    this.dump(indent, '_name - ' + this._name);
    this._files.forEach(file => {
      file.dumpToLog(indent);
    });
    this.dump(indent, '');
  }
}
