'use strict';

import * as vscode from 'vscode';

import fs = require('fs');
import path = require('path');
import { write, readSync } from 'clipboardy';

import { File } from './File';
import { Tasks } from './Tasks';
import { Task } from './Task';
import { DebLog } from './DebLog';

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
  private static deb: DebLog;

  public static initAndLoad(newTasks: Tasks): Tasks {
    this.deb = new DebLog();
    this.deb.ind('initAndLoad');

    this.tasks = newTasks;
    var taskmarksFile = Persist.tasksDataFilePath;
    if (taskmarksFile) {
      if (!fs.existsSync(taskmarksFile)) {
        this.deb.out();
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
        this.deb.out();
        return newTasks;
      }
    }
    this.deb.out();
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
    this.deb.ind('persistTask');
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
    this.deb.out();
    return persistedTask;
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
    this.deb.ind('copyToClipboard');
    if (!this.tasks.activeTask) {
      this.deb.out();
      return;
    }
    const persistedActiveTask = this.persistTask(this.tasks.activeTask);

    const activeTaskString = JSON.stringify(persistedActiveTask);

    write(activeTaskString);
    this.deb.out();
  }

  public static pasteFromClipboard(): void {
    this.deb.ind('copyToClipboard');
    const activeTaskString = readSync();

    if (!activeTaskString) {
      vscode.window.showInformationMessage('Could not paste Task from Clipboard.');
      this.deb.out();
      return;
    }

    this.deb.dump(0, '############################ from clipboard ############################');
    this.deb.dump(0, activeTaskString);
    this.deb.dump(0, '########################################################################');

    try {
      const persistedTask = <IPersistTask>JSON.parse(activeTaskString);
      const newTask = Persist.persistedToTask(persistedTask);

      this.tasks.addTask(newTask);

      this.saveTasks();
    } catch (error) {
      vscode.window.showInformationMessage('PasteFromClipboar failed with ' + error);
    }
    this.deb.out();
  }

  public static dumpIPersistTask(persistedTask: IPersistTask) {
    let indent = 0;
    this.deb.dump(indent, '------------------------------------------------------');
    this.deb.dump(indent, '-------------------- IPersistTask --------------------');
    this.deb.dump(indent, 'persistedTask.name           - ' + persistedTask.name);
    this.deb.dump(indent, 'persistedTask.activeFileName - ' + persistedTask.activeFileName);
    persistedTask.files.forEach(persistedFile => {
      this.dumpIPersistFile(indent, persistedFile);
    });
    this.deb.dump(indent, '');
  }

  public static dumpIPersistFile(indent: number, persistedFile: IPersistFile) {
    indent++;
    this.deb.dump(indent, '------------------------------------------');
    this.deb.dump(indent, '-------------- IPersistFile --------------');
    this.deb.dump(indent, 'persistedTask.name           - ' + persistedFile.filepath);
    this.deb.dump(indent + 1, '-------------- Mark --------------');
    persistedFile.marks.forEach(mark => {
      this.deb.dump(indent + 1, 'mark - ' + mark);
    });
    this.deb.dump(indent, '');
  }
}
