import { File } from './File';
import { Mark } from './Mark';
import { Ring } from './Ring';
import { PathHelper } from './PathHelper';
import type { IPersistFile, IPersistTask, PathMark } from './types';

export class Task {
  private _name: string;
  private _activeFile: File | undefined;
  private _files: Ring<File>;

  constructor(name: string) {
    this._name = name;
    this._files = new Ring();
  }

  get name(): string {
    return this._name;
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

  set activeFile(file: File | undefined) {
    this._activeFile = file;
  }

  get files(): Ring<File> {
    return this._files;
  }

  get allMarks(): PathMark[] {
    return this._files.reduce<PathMark[]>((pathMarks, file) => {
      if (file !== null && file !== undefined) {
        const fileMarks: PathMark[] = [];
        file.allMarks.forEach((mark) => {
          fileMarks.push({
            fullPath: file.filepath,
            lineNumber: mark.lineNumber,
          });
        });
        pathMarks.push(...fileMarks);
      }
      return pathMarks;
    }, []);
  }

  // private _files: Ring<File>;

  // constructor(name: string) {
  //   this._name = name;
  //   this._files = new Ring();

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
            fileFound.mergeMarksAndLineNumbers(oldFile);
          }
        }
      });
    }

    if (
      persistTaskToMerge === undefined ||
      persistTaskToMerge.files === undefined
    ) {
      return this;
    }
    // now do the same with persistTaskToMerge.files
    if (persistTaskToMerge.files.length > 0) {
      persistTaskToMerge.files.forEach((persistFile) => {
        const fileFound: File | undefined = newFiles.find(
          (newFile) => persistFile.filepath === newFile?.filepath
        );

        if (fileFound === undefined) {
          const newFile = new File(persistFile.filepath, -1);
          if (persistFile.lineNumbers && persistFile.lineNumbers.length > 0) {
            persistFile.lineNumbers.forEach((lineNumber) => {
              newFile.addMark(lineNumber);
            });
          }
          newFiles.push(newFile);
        } else {
          // if double, merge line numbers
          fileFound.mergeMarksAndLineNumbers(persistFile);
        }
      });
    }

    // replace old _files Ring with newFiles
    this._files = newFiles;

    return this;
  }

  toggle(path: string, lineNumber: number): boolean {
    console.log('Task.toggle() - path: ', path);

    const reducedPath = PathHelper.reducePath(path);
    console.log('Task.toggle() - reducedPath: ', reducedPath);
    console.log('Task.toggle() - this._files: ', this._files);

    let file: File | undefined = this._files.find((fm) => {
      if (fm) {
        return fm.filepath === reducedPath;
      }
    });

    if (file) {
      file.toggleTaskMark(lineNumber);
    } else {
      file = new File(reducedPath, lineNumber);
      this._files.push(file);
    }

    return file.hasMarks();
  }

  use(path: string): File {
    const filePath = PathHelper.reducePath(path);

    let file: File | undefined = this.getFile(filePath);

    if (!file) {
      file = new File(filePath, -1);
      this._files.push(file);
    }

    this.activeFile = file;

    return file;
  }

  getFile(reducedFilePath: string): File | undefined {
    const fileMark: File | undefined = this._files.find((fm) => {
      if (fm) {
        return fm.filepath === reducedFilePath;
      }
    });

    return fileMark;
  }

  // dumpToLog(indent: number): void {
  //   indent++;
  //   // console.log(indent, '--------------------------');
  //   // console.log(indent, '---------- Task ----------');
  //   // console.log(indent, '_name - ' + this._name);
  //   this._files.forEach((file) => {
  //     if (file) {
  //       file.dumpToLog(indent);
  //     }
  //   });
  //   // console.log(indent, '');
  // }
}
