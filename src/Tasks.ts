'use strict';

import * as _ from 'lodash';

import { Task } from './Task';
import { DecoratorHelper } from './DecoratorHelper';
import { StatusBarItem, window, StatusBarAlignment } from 'vscode';
import type { IPersistTask } from './Models';

export class Tasks {
  private static _instance: Tasks;

  public static instance(): Tasks {
    if (!this._instance) {
      this._instance = new Tasks();
    }

    return this._instance;
  }

  private _allTasks: Array<Task>;
  private _activeTask: Task;
  private _statusBarItem: StatusBarItem;

  public get allTasks(): Array<Task> {
    return this._allTasks;
  }

  public get activeTask(): Task {
    return this._activeTask;
  }

  public set activeTask(task: Task) {
    this.setActiveTask(task.name);
  }

  private constructor() {
    this._allTasks = [];
    this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right);
    this._activeTask = this.use();
  }

  public setActiveTask(taskname: string) {
    const activeTask = _.find(this._allTasks, (task) => task.name === taskname);
    if (activeTask) {
      this._activeTask = activeTask;
      this._statusBarItem.text = 'TaskMarks: ' + this._activeTask.name;
      this._statusBarItem.show();
    } else {
      this._statusBarItem.hide();
      this.use();
    }
  }

  public addTask(task: IPersistTask) {
    const current = this.use(task.name);

    current.mergeWith(task);
    // this.dumpToLog();
  }

  public use(taskname = 'default'): Task {
    let task = _.find(this._allTasks, (task) => task.name === taskname);

    if (!task) {
      task = new Task(taskname);
      this._allTasks.push(task);
    }
    this.setActiveTask(task.name);

    // this.dumpToLog();
    return task;
  }

  public delete(taskname: string): Task {
    const task = _.find(this._allTasks, (task) => task.name === taskname);

    if (task) {
      _.remove(this._allTasks, (task) => task.name === taskname);
    }

    // this.dumpToLog();
    return this.use();
  }

  public nextMark(activeFile: string, currentline: number) {
    const activeTask = this.activeTask;
    if (!activeTask || !activeTask.files || activeTask.files.length === 0) {
      return;
    }

    if (!activeTask.activeFile) {
      return;
    }
    // eslint-disable-next-line prefer-const
    for (let mark of activeTask.activeFile.marks) {
      if (mark > currentline) {
        DecoratorHelper.showLine(mark);
        return;
      }
    }

    this.nextDocument();
  }

  public previousMark(activeFile: string, currentline: number) {
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

  public nextDocument() {
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

  public previousDocument() {
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

  public get taskNames(): Array<string> {
    const taskNames: Array<string> = [];

    this._allTasks.forEach((task) => {
      taskNames.push(task.name);
    });

    return taskNames;
  }

  public dumpToLog(): void {
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
    this._allTasks.forEach((task) => {
      task.dumpToLog(indent);
    });
    // console.log(
    //   indent,
    //   '---------------------------------------------------------------------------------'
    // );
    // console.log(indent, '');
  }
}
