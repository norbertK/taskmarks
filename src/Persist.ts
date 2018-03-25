'use strict';

import * as vscode from 'vscode';
import fs = require('fs');
import path = require('path');

import { File } from './File';
import { Tasks } from './Tasks';

export interface IPersistFile {
  filepath: string;
  marks: Array<number>;
}
export interface IPersistTask {
  name: string;
  activeFileName: string;
  files: Array<IPersistFile>;
}
export interface IPersistTasks {
  activeTaskName: string;
  tasks: Array<IPersistTask>;
}

import { debLog, debIn, debOut } from './DebLog';
const className = 'Persist';
function ind(methodName: string, text = '') {
  debIn(className, methodName, text);
}
function out(methodName: string, text = '') {
  debOut(className, methodName, text);
}
function log(methodName: string, text = '') {
  debLog(className, methodName, text);
}

export class Persist {
  private static tasks: Tasks;
  private static _tasksDataFilePath: string;

  public static saveTasks(): void {
    ind('saveTasks');
    var taskmarksFile = Persist.tasksDataFilePath;
    if (!taskmarksFile || !fs.existsSync(path.dirname(taskmarksFile))) {
      fs.mkdirSync(path.dirname(taskmarksFile));
    }

    let persistTaskArray: Array<IPersistTask> = [];

    this.tasks.allTasks.forEach(task => {
      const persistTask: IPersistTask = {
        name: task.name,
        activeFileName: task.activeFileName,
        files: []
      };

      persistTaskArray.push(persistTask);

      task.files.forEach(file => {
        if (file.marks.length > 0) {
          const marks: number[] = file.marksForPersist;

          persistTask.files.push({
            filepath: file.filepath,
            marks: marks.sort()
          });
        }
      });
    });

    const persistTasks: IPersistTasks = {
      activeTaskName: this.tasks.activeTask.name,
      tasks: persistTaskArray
    };

    fs.writeFileSync(taskmarksFile, JSON.stringify(persistTasks, null, '\t'));
    out('saveTasks');
  }

  public static loadTasks(newTasks: Tasks): Tasks {
    ind('loadTasks');
    this.tasks = newTasks;
    var taskmarksFile = Persist.tasksDataFilePath;
    if (taskmarksFile) {
      if (!fs.existsSync(taskmarksFile)) {
        log('loadTasks', 'no taskmark file found');
        out('loadTasks');
        return newTasks;
      }
      try {
        const stringFromFile: string = fs.readFileSync(taskmarksFile).toString();

        const persistedTasks = <IPersistTasks>JSON.parse(stringFromFile);

        persistedTasks.tasks.forEach(persistedTask => {
          let task = newTasks.use(persistedTask.name);

          persistedTask.files.forEach(persistedFile => {
            let file: File = new File(persistedFile.filepath, -1);
            file.setMarksFromPersist(persistedFile.marks);
            task.files.push(file);
          });
        });

        newTasks.use(persistedTasks.activeTaskName);

        out('loadTasks');

        return newTasks;
      } catch (error) {
        vscode.window.showErrorMessage('Error loading taskmarks: ' + error.toString() + ' Using "default"');
        out('loadTasks');
        return newTasks;
      }
    }
  }

  public static get tasksDataFilePath(): string {
    if (!this._tasksDataFilePath) {
      this._tasksDataFilePath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.vscode', 'taskmarks.json');
    }

    return this._tasksDataFilePath;
  }
}
