'use strict';

import * as vscode from 'vscode';

import fs = require('fs');
import path = require('path');
import { write, readSync } from 'clipboardy';

import { File } from './File';
import { Tasks } from './Tasks';
import { Task } from './Task';

interface IPersistFile {
  filepath: string;
  marks: Array<number>;
}
interface IPersistTask {
  name: string;
  activeFileName: string | undefined;
  files: Array<IPersistFile>;
}
interface IPersistTasks {
  activeTaskName: string;
  tasks: Array<IPersistTask>;
}

export class Persist {
  private static tasks: Tasks;
  private static _tasksDataFilePath: string;

  public static saveTasks(): void {
    var taskmarksFile = Persist.tasksDataFilePath;
    if (!taskmarksFile || !fs.existsSync(path.dirname(taskmarksFile))) {
      fs.mkdirSync(path.dirname(taskmarksFile));
    }

    let persistTaskArray: Array<IPersistTask> = [];

    this.tasks.allTasks.forEach(task => {
      const persistTask: IPersistTask = this.persistTask(task);
      persistTaskArray.push(persistTask);
    });

    if (!this.tasks.activeTask) {
      return;
    }
    const persistTasks: IPersistTasks = {
      activeTaskName: this.tasks.activeTask.name,
      tasks: persistTaskArray
    };

    fs.writeFileSync(taskmarksFile, JSON.stringify(persistTasks, null, '\t'));
  }

  private static persistTask(task: Task): IPersistTask {
    const persistedTask: IPersistTask = {
      name: task.name,
      activeFileName: task.activeFileName,
      files: []
    };

    task.files.forEach(file => {
      if (file.marks.length > 0) {
        const marks: number[] = file.marksForPersist;

        persistedTask.files.push({
          filepath: file.filepath,
          marks: marks.sort()
        });
      }
    });
    return persistedTask;
  }

  public static loadTasks(newTasks: Tasks): Tasks {
    this.tasks = newTasks;
    var taskmarksFile = Persist.tasksDataFilePath;
    if (taskmarksFile) {
      if (!fs.existsSync(taskmarksFile)) {
        return newTasks;
      }
      try {
        const stringFromFile: string = fs.readFileSync(taskmarksFile).toString();

        const persistedTasks = <IPersistTasks>JSON.parse(stringFromFile);

        persistedTasks.tasks.forEach(persistedTask => {
          const newTask = Persist.persistedToTask(persistedTask);
          newTasks.addTask(newTask);
        });

        newTasks.use(persistedTasks.activeTaskName);

        return newTasks;
      } catch (error) {
        vscode.window.showErrorMessage('Error loading taskmarks: ' + error.toString() + ' Using "default"');
        return newTasks;
      }
    }
    return newTasks;
  }

  private static persistedToTask(persistedTask: IPersistTask): Task {
    let task = this.tasks.use(persistedTask.name);
    persistedTask.files.forEach(persistedFile => {
      let file: File = new File(persistedFile.filepath, -1);
      file.setMarksFromPersist(persistedFile.marks);
      task.files.push(file);
    });
    return task;
  }

  public static get tasksDataFilePath(): string {
    if (!this._tasksDataFilePath) {
      if (!vscode.workspace.workspaceFolders) {
        vscode.window.showErrorMessage('Error loading vscode.workspace! Stop!');
        throw new Error('Error loading vscode.workspace! Stop!');
      }
      this._tasksDataFilePath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.vscode', 'taskmarks.json');
    }

    return this._tasksDataFilePath;
  }

  public static copyToClipboard(): void {
    if (!this.tasks.activeTask) {
      return;
    }
    const persistedActiveTask = this.persistTask(this.tasks.activeTask);

    const activeTaskString = JSON.stringify(persistedActiveTask);

    write(activeTaskString);
  }

  public static pasteFromClipboard(): void {
    const activeTaskString = readSync();

    if (!activeTaskString) {
      vscode.window.showInformationMessage('Could not paste Task from Clipboard.');
      return;
    }

    try {
      const persistedTask = <IPersistTask>JSON.parse(activeTaskString);
      const newTask = Persist.persistedToTask(persistedTask);

      // const task = this.tasks.use(persistedTask.name);
      // if (task.allMarks.length > 0) {
      //   // todo: do you really ...  vscode.window.showInputBox()
      //   // throw ...
      // }

      this.tasks.addTask(newTask);

      this.saveTasks();
    } catch (error) {
      vscode.window.showInformationMessage('PasteFromClipboar failed with ' + error);
    }
  }
}
