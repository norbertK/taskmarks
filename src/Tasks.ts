'use strict';

import * as _ from 'lodash';

import { ITasks } from './Models';
import { Task } from './Task';
import { Helper } from './Helper';

import { debLog, debIn, debOut, debBackFrom } from './DebLog';
const className = 'Tasks';
function ind(methodName: string, text = '') {
  debIn(className, methodName, text);
}
function out(methodName: string, text = '') {
  debOut(className, methodName, text);
}
// function log(methodName: string, text = '') {
//   debLog(className, methodName, text);
// }
// function backFrom(count: number, methodName: string, text = '') {
//   debBackFrom(count, className, methodName, text);
// }

export class Tasks implements ITasks {
  private static _instance: Tasks;

  public static instance(): Tasks {
    if (!this._instance) {
      this._instance = new Tasks();
    }

    return this._instance;
  }

  private _allTasks: Array<Task>;
  private _activeTask: Task | undefined;

  public get allTasks(): Array<Task> {
    return this._allTasks;
  }

  public get activeTask(): Task | undefined {
    return this._activeTask;
  }

  public set activeTask(task: Task | undefined) {
    this._activeTask = task;
  }

  public setActiveTask(taskname: string) {
    let activeTask = _.find(this._allTasks, task => task.name === taskname);
    this._activeTask = activeTask;
  }

  public addTask(task: Task) {
    ind('addTask', 'with task.name === ' + task.name);
    let current = this.use(task.name);

    current.mergeWith(task);
    out('addTask', 'with task.name === ' + task.name);
  }

  private constructor() {
    this._allTasks = [];
    this.use('default');
  }

  public use(taskname: string): Task {
    let task = _.find(this._allTasks, task => task.name === taskname);

    if (!task) {
      task = new Task(taskname);

      this._allTasks.push(task);
    }
    this._activeTask = task;

    return task;
  }

  public nextMark(activeFile: string, currentline: number) {
    let activeTask = this.activeTask;
    if (!activeTask || !activeTask.files || activeTask.files.length === 0) {
      return;
    }

    if (!activeTask.activeFile) {
      return;
    }
    for (let mark of activeTask.activeFile.marks) {
      if (mark > currentline) {
        Helper.showLine(mark);
        return;
      }
    }

    this.nextDocument();
  }

  public previousMark(activeFile: string, currentline: number) {
    let activeTask = this.activeTask;
    if (!activeTask || !activeTask.files || activeTask.files.length === 0) {
      return;
    }

    if (!activeTask.activeFile) {
      return;
    }
    for (let index = activeTask.activeFile.marks.length - 1; index > -1; index--) {
      const mark = activeTask.activeFile.marks[index];

      if (mark < currentline) {
        Helper.showLine(mark);
        return;
      }
    }

    this.previousDocument();
  }

  public nextDocument() {
    if (!this.activeTask || this.activeTask.files.length === 0) {
      return;
    }

    Helper.openAndShow(this.activeTask.files.next.filepath);
  }

  public previousDocument() {
    if (!this.activeTask || this.activeTask.files.length === 0) {
      return;
    }

    Helper.openAndShow(this.activeTask.files.previous.filepath);
  }

  public get taskNames(): Array<string> {
    let taskNames: Array<string> = [];

    this._allTasks.forEach(task => {
      taskNames.push(task.name);
    });

    return taskNames;
  }
}
