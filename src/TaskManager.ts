'use strict';

import * as _ from 'lodash';

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

  static instance(): TaskManager {
    if (!this._instance) {
      this._instance = new TaskManager();
    }

    return this._instance;
  }

  get activeTask(): Task {
    return this._activeTask;
  }

  set activeTask(task: Task) {
    this.setActiveTask(task.name);
  }

  setActiveTask(taskname: string) {
    const activeTask = _.find(this.allTasks, (task) => task.name === taskname);
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
    // this.dumpToLog();
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
    const task = _.find(this.allTasks, (task) => task.name === taskname);

    if (task) {
      _.remove(this.allTasks, (task) => task.name === taskname);
    }

    // this.dumpToLog();
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

  get taskNames(): Array<string> {
    const taskNames: Array<string> = [];

    this.allTasks.forEach((task) => {
      taskNames.push(task.name);
    });

    return taskNames;
  }

  dumpToLog(): void {
    const indent = 0;
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
    this.allTasks.forEach((task) => {
      task.dumpToLog(indent);
    });
    // console.log(
    //   indent,
    //   '---------------------------------------------------------------------------------'
    // );
    // console.log(indent, '');
  }
}
