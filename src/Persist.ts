'use strict';

import * as vscode from 'vscode';

import fs = require('fs');
import path = require('path');
import { write, readSync } from 'clipboardy';

import { File } from './File';
import { Tasks } from './Tasks';
import { Task } from './Task';

export class Persist {
  private static tasks: Tasks;
  private static _tasksDataFilePath: string;

  public static initAndLoad(newTasks: Tasks): Tasks {
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

  private static persistedToTask(persistedTask: IPersistTask): Task {
    let task = new Task(persistedTask.name);
    //this.tasks.use(persistedTask.name);
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
      // this.dumpIPersistTask(persistedTask);

      this.tasks.addTask(persistedTask);

      this.saveTasks();
    } catch (error) {
      vscode.window.showInformationMessage('PasteFromClipboar failed with ' + error);
    }
  }

  public static dumpIPersistTask(persistedTask: IPersistTask) {
    let indent = 0;
    console.log('persistedTask.name - ' + persistedTask.name);
    persistedTask.files.forEach(persistedFile => {
      this.dumpIPersistFile(indent, persistedFile);
    });
  }

  public static dumpIPersistFile(indent: number, persistedFile: IPersistFile) {
    indent++;
    console.log(indent, '------------------------------------------');
    console.log(indent, '-------------- IPersistFile --------------');
    console.log(indent, 'persistedTask.name           - ' + persistedFile.filepath);
    console.log(indent + 1, '-------------- Mark --------------');
    persistedFile.marks.forEach(mark => {
      console.log(indent + 1, 'mark - ' + mark);
    });
    console.log(indent, '');
  }
}
