'use strict';

import { Task } from './Task';
import { DecoratorHelper } from './DecoratorHelper';
import { StatusBarItem, window, StatusBarAlignment } from 'vscode';
import type { IPersistTask } from './types';

export class TaskManager {
  allTasks: Task[];
  private static _instance: TaskManager;
  private _activeTask: Task;
  private _statusBarItem: StatusBarItem;
  constructor() {
    this.allTasks = [];
    this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right);
    this._activeTask = this.useActiveTask();
  }

  static get instance(): TaskManager {
    if (this._instance == null) {
      this._instance = new TaskManager();
    }

    return this._instance;
  }

  get activeTask(): Task {
    return this._activeTask;
  }
  get taskNames(): string[] {
    return this.allTasks.map((task) => task.name);
  }

  setActiveTask(taskname: string) {
    const activeTask = this.allTasks.find((task) => task.name === taskname);
    if (activeTask) {
      this._activeTask = activeTask;
      this._statusBarItem.text = 'TaskMarks: ' + this._activeTask.name;
      this._statusBarItem.show();
    } else {
      this._statusBarItem.hide();
      this.useActiveTask();
    }
  }

  addTask(task: IPersistTask) {
    const current = this.useActiveTask(task.name);
    current.mergeWith(task);
  }

  useActiveTask(taskname = 'default'): Task {
    let task = this.allTasks.find((task) => task.name === taskname);

    if (!task) {
      task = new Task(taskname);
      this.allTasks.push(task);
    }

    this.setActiveTask(task.name);

    // this.dumpToLog();
    return task;
  }

  delete(taskname: string): Task {
    const found = this.allTasks.findIndex((task) => task.name === taskname);

    if (found > -1) {
      this.allTasks.splice(found, 1);
    }

    return this.useActiveTask();
  }

  nextMark(activeFile: string, currentline: number) {
    const activeTask = this.activeTask;
    if (
      activeTask == null ||
      activeTask.files == null ||
      activeTask.files.length === 0 ||
      activeTask.activeFile == null
    ) {
      return;
    }

    for (let mark of activeTask.activeFile.marks) {
      if (mark > currentline) {
        DecoratorHelper.showLine(mark);
        return;
      }
    }

    this.nextDocument();
  }

  previousMark(activeFile: string, currentline: number) {
    const activeTask = this.activeTask;
    if (!activeTask || !activeTask.files || activeTask.files.length === 0) {
      return;
    }

    if (!activeTask.activeFile) {
      return;
    }
    for (
      let index = activeTask.activeFile.marks.length - 1;
      index > -1;
      index--
    ) {
      const mark = activeTask.activeFile.marks[index];

      if (mark < currentline) {
        DecoratorHelper.showLine(mark);
        return;
      }
    }

    this.previousDocument();
  }

  nextDocument() {
    if (!this.activeTask || this.activeTask.files.length === 0) {
      return;
    }

    let currentFile = this.activeTask.activeFile;
    let nextFile = this.activeTask.files.next;
    while (currentFile !== nextFile) {
      if (nextFile && nextFile.marks && nextFile.marks.length > 0) {
        currentFile = nextFile;
      } else {
        nextFile = this.activeTask.files.next;
      }
    }
    if (currentFile) {
      DecoratorHelper.openAndShow(currentFile.filepath, currentFile.marks[0]);
    }
  }

  previousDocument() {
    if (!this.activeTask || this.activeTask.files.length === 0) {
      return;
    }

    let currentFile = this.activeTask.activeFile;
    let previousFile = this.activeTask.files.previous;
    while (currentFile !== previousFile) {
      if (previousFile && previousFile.marks && previousFile.marks.length > 0) {
        currentFile = previousFile;
      } else {
        previousFile = this.activeTask.files.next;
      }
    }
    if (currentFile) {
      DecoratorHelper.openAndShow(currentFile.filepath, currentFile.marks[0]);
    }
  }

  // dumpToLog(): void {
  //   const indent = 0;
  // console.log(indent, '');
  // console.log(
  //   indent,
  //   '---------------------------------------------------------------------------------'
  // );
  // console.log(
  //   indent,
  //   '------------------------------------- Tasks -------------------------------------'
  // );
  // console.log(indent, '_activeTask.name - ' + this._activeTask.name);
  // this.allTasks.forEach((task) => {
  //   task.dumpToLog(indent);
  // });
  // console.log(
  //   indent,
  //   '---------------------------------------------------------------------------------'
  // );
  // console.log(indent, '');
  // }
}
