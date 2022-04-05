import * as vscode from 'vscode';

import { TaskManager } from './TaskManager';
import { Task } from './Task';

import type { IPersistTask, IPersistTasks } from './types';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { PathHelper } from './PathHelper';

enum PathType {
  unixLike,
  windowsLike,
}

export class Persist {
  private static _taskManager: TaskManager;
  private static _tasksDataFilePath: string;
  // private static _pathType: PathType;
  private static _activePathChar: string;
  private static _inactivePathChar: string;

  static initAndLoad(taskManager: TaskManager): void {
    // console.log('Persist.initAndLoad()');

    this._taskManager = taskManager;
    const taskmarksFile = Persist.taskmarksDataFilePath;
    if (taskmarksFile === null || !existsSync(taskmarksFile)) {
      return;
    }

    const stringFromFile = readFileSync(taskmarksFile).toString();
    const { tasks, activeTaskName }: IPersistTasks = JSON.parse(stringFromFile);

    tasks.forEach((task) => {
      if (task.name === activeTaskName) {
        task.files.forEach((file) => {
          console.log(file.filepath);

          file.filepath = file.filepath.replace(
            Persist._inactivePathChar,
            Persist._activePathChar
          );

          console.log(file.filepath);

          if (existsSync(PathHelper.basePath + file.filepath)) {
            console.log(file.filepath, 'used');
            taskManager.addTask(task);
          } else {
            console.log(file.filepath, 'not used');
          }
        });
      }
    });

    taskManager.useActiveTask(activeTaskName);
  }

  static saveTasks(): void {
    const taskmarksFile = Persist.taskmarksDataFilePath;
    if (!taskmarksFile || !existsSync(dirname(taskmarksFile))) {
      mkdirSync(dirname(taskmarksFile));
    }

    const persistTaskArray: IPersistTask[] = [];

    this._taskManager.allTasks.forEach((task) => {
      const persistTask: IPersistTask = this.taskToPersistTask(task);
      persistTaskArray.push(persistTask);
    });

    if (!this._taskManager.activeTask) {
      return;
    }
    const persistTasks: IPersistTasks = {
      activeTaskName: this._taskManager.activeTask.name,
      tasks: persistTaskArray,
    };

    writeFileSync(taskmarksFile, JSON.stringify(persistTasks, null, '\t'));
  }

  static get taskmarksDataFilePath(): string {
    // console.log('Persist.taskmarksDataFilePath()');
    if (!this._tasksDataFilePath) {
      if (!vscode.workspace.workspaceFolders) {
        throw new Error('Error loading vscode.workspace! Stop!');
      }
      this._tasksDataFilePath = join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        '.vscode',
        'taskmarks.json'
      );

      if (this._tasksDataFilePath.indexOf('/') > -1) {
        // Persist._pathType = PathType.unixLike;
        Persist._activePathChar = '/';
        Persist._inactivePathChar = '\\';
      } else {
        // Persist._pathType = PathType.windowsLike;
        Persist._activePathChar = '\\';
        Persist._inactivePathChar = '/';
      }
    }

    return this._tasksDataFilePath;
  }

  // static copyToClipboard(): void {
  //   if (!this.taskManager.activeTask) {
  //     return;
  //   }
  //   const persistedActiveTask = this.persistTask(this.taskManager.activeTask);

  //   const activeTaskString = JSON.stringify(persistedActiveTask);

  //   clipboard.write(activeTaskString);
  // }

  // static pasteFromClipboard(): void {
  //   const activeTaskString = clipboard.readSync();

  //   if (!activeTaskString) {
  //     vscode.window.showInformationMessage(
  //       'Could not paste Task from Clipboard.'
  //     );
  //     return;
  //   }

  //   try {
  //     const persistedTask = <IPersistTask>JSON.parse(activeTaskString);
  //     // this.dumpIPersistTask(persistedTask);

  //     this.taskManager.addTask(persistedTask);

  //     this.saveTasks();
  //   } catch (error) {
  //     vscode.window.showInformationMessage(
  //       'PasteFromClipboar failed with ' + error
  //     );
  //   }
  // }

  private static taskToPersistTask(task: Task): IPersistTask {
    const persistTask: IPersistTask = {
      name: task.name,
      files: [],
    };

    task.files.forEach((file) => {
      // TODO NK && file.exists()
      if (file && file.lineNumbers && file.lineNumbers.length > 0) {
        const marks: number[] = file.lineNumbersForPersist;

        persistTask.files.push({
          filepath: file.filepath,
          marks: marks.sort(),
        });
      }
    });
    return persistTask;
  }

  // static dumpIPersistTask(persistedTask: IPersistTask) {
  //   const indent = 0;
  //   // console.log('persistedTask.name - ' + persistedTask.name);
  //   persistedTask.files.forEach((persistedFile) => {
  //     this.dumpIPersistFile(indent, persistedFile);
  //   });
  // }

  // static dumpIPersistFile(indent: number, persistedFile: IPersistFile) {
  //   indent++;
  //   // eslint-disable-next-line no-console
  //   console.log(indent, '------------------------------------------');
  //   // eslint-disable-next-line no-console
  //   console.log(indent, '-------------- IPersistFile --------------');
  //   // eslint-disable-next-line no-console
  //   console.log(
  //     indent,
  //     'persistedTask.name           - ' + persistedFile.filepath
  //   );
  //   // eslint-disable-next-line no-console
  //   console.log(indent + 1, '-------------- Mark --------------');
  //   persistedFile.marks.forEach((mark) => {
  //     // eslint-disable-next-line no-console
  //     console.log(indent + 1, 'mark - ' + mark);
  //   });
  //   // eslint-disable-next-line no-console
  //   console.log(indent, '');
  // }

  // private static persistedToTask(persistedTask: IPersistTask): Task {
  //   const task = new Task(persistedTask.name);
  //   //this.tasks.use(persistedTask.name);
  //   persistedTask.files.forEach((persistedFile) => {
  //     const file: File = new File(persistedFile.filepath, -1);
  //     file.setMarksFromPersist(persistedFile.marks);
  //     task.files.push(file);
  //   });
  //   return task;
  // }
}
