import * as vscode from 'vscode';

import { TaskManager } from './TaskManager';
import { Task } from './Task';

import type { IPersistTask, IPersistTasks } from './types';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

export class Persist {
  private static taskManager: TaskManager;
  private static _tasksDataFilePath: string;

  static initAndLoad(taskManager: TaskManager) {
    console.log('Persist.initAndLoad()');

    this.taskManager = taskManager;
    const taskmarksFile = Persist.taskmarksDataFilePath;
    if (taskmarksFile == null || !existsSync(taskmarksFile)) return;

    const stringFromFile = readFileSync(taskmarksFile).toString();
    const { tasks, activeTaskName }: IPersistTasks = JSON.parse(stringFromFile);

    tasks.forEach((task) => {
      taskManager.addTask(task);
    });

    taskManager.useActiveTask(activeTaskName);
  }

  static saveTasks(): void {
    const taskmarksFile = Persist.taskmarksDataFilePath;
    if (!taskmarksFile || !existsSync(dirname(taskmarksFile))) {
      mkdirSync(dirname(taskmarksFile));
    }

    const persistTaskArray: IPersistTask[] = [];

    this.taskManager.allTasks.forEach((task) => {
      const persistTask: IPersistTask = this.persistTask(task);
      persistTaskArray.push(persistTask);
    });

    if (!this.taskManager.activeTask) {
      return;
    }
    const persistTasks: IPersistTasks = {
      activeTaskName: this.taskManager.activeTask.name,
      tasks: persistTaskArray,
    };

    writeFileSync(taskmarksFile, JSON.stringify(persistTasks, null, '\t'));
  }

  static get taskmarksDataFilePath(): string {
    console.log('Persist.taskmarksDataFilePath()');
    if (!this._tasksDataFilePath) {
      if (!vscode.workspace.workspaceFolders) {
        throw new Error('Error loading vscode.workspace! Stop!');
      }
      this._tasksDataFilePath = join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        '.vscode',
        'taskmarks.json'
      );
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

  private static persistTask(task: Task): IPersistTask {
    const persistedTask: IPersistTask = {
      name: task.name,
      files: [],
    };

    task.files.forEach((file) => {
      if (file && file.marks && file.marks.length > 0) {
        const marks: number[] = file.marksForPersist;

        persistedTask.files.push({
          filepath: file.filepath,
          marks: marks.sort(),
        });
      }
    });
    return persistedTask;
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
