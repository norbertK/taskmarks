'use strict';

import * as vscode from 'vscode';

import fs = require('fs');
import path = require('path');
import { write, readSync } from 'clipboardy';

import { TaskManager } from './TaskManager';
import { Task } from './Task';

import type { IPersistTask, IPersistTasks } from './types';

export class Persist {
  private static taskManager: TaskManager;
  private static _tasksDataFilePath: string;

  public static initAndLoad(taskManager: TaskManager) {
    this.taskManager = taskManager;
    const taskmarksFile = Persist.tasksDataFilePath;
    if (taskmarksFile == null || !fs.existsSync(taskmarksFile)) return;

    const stringFromFile = fs.readFileSync(taskmarksFile).toString();
    const { tasks, activeTaskName }: IPersistTasks = JSON.parse(stringFromFile);

    tasks.forEach((task) => {
      taskManager.addTask(task);
    });

    taskManager.useActiveTask(activeTaskName);
  }

  public static saveTasks(): void {
    const taskmarksFile = Persist.tasksDataFilePath;
    if (!taskmarksFile || !fs.existsSync(path.dirname(taskmarksFile))) {
      fs.mkdirSync(path.dirname(taskmarksFile));
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

    fs.writeFileSync(taskmarksFile, JSON.stringify(persistTasks, null, '\t'));
  }

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

  public static get tasksDataFilePath(): string {
    if (!this._tasksDataFilePath) {
      if (!vscode.workspace.workspaceFolders) {
        vscode.window.showErrorMessage('Error loading vscode.workspace! Stop!');
        throw new Error('Error loading vscode.workspace! Stop!');
      }
      this._tasksDataFilePath = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        '.vscode',
        'taskmarks.json'
      );
    }

    return this._tasksDataFilePath;
  }

  public static copyToClipboard(): void {
    if (!this.taskManager.activeTask) {
      return;
    }
    const persistedActiveTask = this.persistTask(this.taskManager.activeTask);

    const activeTaskString = JSON.stringify(persistedActiveTask);

    write(activeTaskString);
  }

  public static pasteFromClipboard(): void {
    const activeTaskString = readSync();

    if (!activeTaskString) {
      vscode.window.showInformationMessage(
        'Could not paste Task from Clipboard.'
      );
      return;
    }

    try {
      const persistedTask = <IPersistTask>JSON.parse(activeTaskString);
      // this.dumpIPersistTask(persistedTask);

      this.taskManager.addTask(persistedTask);

      this.saveTasks();
    } catch (error) {
      vscode.window.showInformationMessage(
        'PasteFromClipboar failed with ' + error
      );
    }
  }

  // public static dumpIPersistTask(persistedTask: IPersistTask) {
  //   const indent = 0;
  //   // console.log('persistedTask.name - ' + persistedTask.name);
  //   persistedTask.files.forEach((persistedFile) => {
  //     this.dumpIPersistFile(indent, persistedFile);
  //   });
  // }

  // public static dumpIPersistFile(indent: number, persistedFile: IPersistFile) {
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
