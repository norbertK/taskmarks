import * as vscode from 'vscode';

import { TaskManager } from './TaskManager';
import { Task } from './Task';

import type { IPersistFile, IPersistTask, IPersistTaskManager } from './types';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { PathHelper } from './PathHelper';

enum PathType {
  unixLike,
  windowsLike,
}

export class Persist {
  private static _taskManager: TaskManager;
  private static _taskmarksDataFilePath: string;
  private static _activePathChar: string;
  private static _inactivePathChar: string;

  static initAndLoad(taskManager: TaskManager): void {
    this._taskManager = taskManager;
    Persist.taskmarksDataFilePath;
    if (
      Persist._taskmarksDataFilePath === null ||
      Persist._taskmarksDataFilePath === undefined ||
      !existsSync(Persist._taskmarksDataFilePath)
    ) {
      return;
    }
    let stringFromFile = readFileSync(
      Persist._taskmarksDataFilePath
    ).toString();

    if (stringFromFile.indexOf('marks') > -1) {
      stringFromFile = stringFromFile.replace('marks', 'lineNumbers');

      while (stringFromFile.indexOf('marks') > -1) {
        stringFromFile = stringFromFile.replace('marks', 'lineNumbers');
      }
    }

    const { tasks, activeTaskName }: IPersistTaskManager =
      JSON.parse(stringFromFile);
    const files: IPersistFile[] = [];

    tasks.forEach((task) => {
      if (task.name === activeTaskName) {
        task.files.forEach((file) => {
          file.filepath = file.filepath.replace(
            Persist._inactivePathChar,
            Persist._activePathChar
          );

          const fullPath = PathHelper.getFullPath(file.filepath);
          if (fullPath !== undefined) {
            files.push(file);
          }
        });

        if (files && files.length > 0) {
          task.files = files;
          taskManager.addTask(task);
        }
      }
    });
    if (taskManager.activeTask.name !== activeTaskName) {
      taskManager.useActiveTask(activeTaskName);
    }
  }

  static saveTasks(): void {
    const taskmarksFile = Persist.taskmarksDataFilePath;
    if (!taskmarksFile || !existsSync(dirname(taskmarksFile))) {
      mkdirSync(dirname(taskmarksFile));
    }

    const persistTaskArray: IPersistTask[] = [];

    this._taskManager.allTasks.forEach((task) => {
      const persistTask: IPersistTask = this.copyTaskToPersistTask(task);
      persistTaskArray.push(persistTask);
    });

    if (!this._taskManager.activeTask) {
      return;
    }
    const persistTasks: IPersistTaskManager = {
      activeTaskName: this._taskManager.activeTask.name,
      tasks: persistTaskArray,
    };

    writeFileSync(taskmarksFile, JSON.stringify(persistTasks, null, '\t'));
  }

  static get taskmarksDataFilePath(): string {
    // console.log('Persist.taskmarksDataFilePath()');
    if (!this._taskmarksDataFilePath) {
      if (!vscode.workspace.workspaceFolders) {
        throw new Error('Error loading vscode.workspace! Stop!');
      }
      this._taskmarksDataFilePath = join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        '.vscode',
        'taskmarks.json'
      );

      if (this._taskmarksDataFilePath.indexOf('/') > -1) {
        // Persist._pathType = PathType.unixLike;
        Persist._activePathChar = '/';
        Persist._inactivePathChar = '\\';
      } else {
        // Persist._pathType = PathType.windowsLike;
        Persist._activePathChar = '\\';
        Persist._inactivePathChar = '/';
      }
    }

    return this._taskmarksDataFilePath;
  }

  static copyToClipboard(): void {
    if (!this._taskManager.activeTask) {
      return;
    }
    const persistTaskVersionOfActiveTask = this.copyTaskToPersistTask(
      this._taskManager.activeTask
    );

    const activeTaskString = JSON.stringify(persistTaskVersionOfActiveTask);

    vscode.env.clipboard.writeText(activeTaskString);
  }

  static pasteFromClipboard(): void {
    vscode.env.clipboard.readText().then((clip) => {
      let activeTaskString = clip;

      if (!activeTaskString) {
        vscode.window.showInformationMessage(
          'Could not paste Task from Clipboard.'
        );
        return;
      }

      try {
        const persistedTask = <IPersistTask>JSON.parse(activeTaskString);
        // this.dumpIPersistTask(persistedTask);

        this._taskManager.addTask(persistedTask);

        this.saveTasks();
      } catch (error) {
        vscode.window.showInformationMessage(
          'PasteFromClipboard failed with ' + error
        );
      }
    });
  }

  private static copyTaskToPersistTask(task: Task): IPersistTask {
    const persistTask: IPersistTask = {
      name: task.name,
      files: [],
    };

    task.files.forEach((file) => {
      if (file && file.lineNumbers && file.lineNumbers.length > 0) {
        const fullPath = PathHelper.getFullPath(file.filepath);
        if (fullPath !== undefined && existsSync(fullPath)) {
          const marks: number[] = file.lineNumbersForPersist;

          const persistFile: IPersistFile = {
            filepath: file.filepath,
            lineNumbers: marks.sort(),
          };
          persistTask.files.push(persistFile);
        }
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
