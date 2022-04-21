import * as vscode from 'vscode';
import { File } from './File';
import { Ring } from './Ring';
import { PathHelper } from './PathHelper';
import type { IPersistTask, PathMark } from './types';

export class Task {
  private _name: string;
  private _activeFile: File | undefined;
  private _files: Ring<File>;

  constructor(name: string) {
    if (name === undefined) {
      throw new Error('Task must always have a name.');
    }
    this._name = name;
    this._files = new Ring();
  }

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  get activeFileFilePath(): string | undefined {
    if (this._activeFile) {
      return this._activeFile.filepath;
    }
    return undefined;
  }

  get activeFile(): File | undefined {
    return this._activeFile;
  }

  // set activeFile(file: File) {
  //   this._activeFile = file;
  // }

  get files(): Ring<File> {
    return this._files;
  }

  get allMarks(): PathMark[] {
    const allMarks: PathMark[] = [];
    this._files.forEach((file) => {
      allMarks.push(...file.allPathMarks);
    });
    return allMarks;
  }

  get quickPickItems(): vscode.QuickPickItem[] {
    const quickPickItems: vscode.QuickPickItem[] = [];
    this._files.forEach((file) => {
      quickPickItems.push(...file.quickPickItems);
    });

    return quickPickItems;
  }

  mergeFilesWithPersistFiles(persistTaskToMerge: IPersistTask): Task {
    // start with an empty Ring
    const newFiles: Ring<File> = new Ring();

    // copy all old, but check for doubles
    if (this._files && this._files.length > 0) {
      this._files.forEach((oldFile) => {
        if (oldFile !== undefined) {
          const fileFound: File | undefined = newFiles.find(
            (newFile) => oldFile?.filepath === newFile?.filepath
          );

          if (fileFound === undefined) {
            newFiles.push(oldFile);
          } else {
            // if double, merge line numbers
            fileFound.mergeMarksAndLineNumbers(oldFile.allPathMarks);
          }
        }
      });
    }

    if (
      persistTaskToMerge === undefined ||
      persistTaskToMerge.persistFiles === undefined
    ) {
      return this;
    }
    // now do the same with persistTaskToMerge.files
    if (persistTaskToMerge.persistFiles.length > 0) {
      persistTaskToMerge.persistFiles.forEach((persistFile) => {
        const fileFound: File | undefined = newFiles.find(
          (newFile) => persistFile.filepath === newFile?.filepath
        );

        if (fileFound === undefined) {
          const newFile = new File(persistFile.filepath, -1);
          if (persistFile.persistMarks && persistFile.persistMarks.length > 0) {
            persistFile.persistMarks.forEach((lineNumber) => {
              newFile.addMark(lineNumber);
            });
          }
          newFiles.push(newFile);
        } else {
          // if double, merge line numbers
          fileFound.mergeMarksAndLineNumbers(persistFile.persistMarks);
        }
      });
    }

    // replace old _files Ring with newFiles
    this._files = newFiles;

    return this;
  }

  lineHasMark(filename: string, lineNumber: number): boolean {
    const reducedFilePath = PathHelper.reducePath(filename);

    let file: File | undefined = this._files.find((aFile) => {
      return aFile.filepath === reducedFilePath;
    });

    if (file && file.hasMark(lineNumber)) {
      return true;
    }

    return false;
  }

  toggle(filename: string, lineNumber: number, label: string): boolean {
    const reducedFilePath = PathHelper.reducePath(filename);

    let file: File | undefined = this._files.find((aFile) => {
      return aFile.filepath === reducedFilePath;
    });

    if (file) {
      file.toggleTaskMark({ lineNumber, label });
    } else {
      file = new File(reducedFilePath, lineNumber, label);
      this._files.push(file);
    }

    return file.hasMarks;
  }

  use(path: string): File {
    const filePath = PathHelper.reducePath(path);
    let file: File | undefined = undefined;
    if (this.hasEntries) {
      file = this.getFile(filePath);
    }

    if (!file) {
      file = new File(filePath, -1);
      // this._files.push(file);
    }

    this._activeFile = file;

    return file;
  }

  getFile(reducedFilePath: string): File | undefined {
    const fileMark: File | undefined = this._files.find((file) => {
      return file.filepath === reducedFilePath;
    });

    return fileMark;
  }

  get hasEntries(): boolean {
    return this._files.length > 0;
  }
}
