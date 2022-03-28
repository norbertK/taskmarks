import { Task } from './Task';
import { DecoratorHelper } from './DecoratorHelper';
import * as vscode from 'vscode';
import type { IPersistTask } from './types';

export class TaskManager {
  private static _instance: TaskManager;

  static get instance(): TaskManager {
    return this._instance || (this._instance = new this());
  }
  private constructor() {
    this._allTasks = [];
    this._statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right
    );
    this._activeTask = this.useActiveTask();
  }

  private _activeTask: Task;
  private _allTasks: Task[];
  private _statusBarItem: vscode.StatusBarItem;

  get activeTask(): Task {
    return this._activeTask;
  }

  get allTasks(): Task[] {
    return this._allTasks;
  }

  get taskNames(): string[] {
    return this._allTasks.map((task) => task.name);
  }

  setActiveTask(taskname: string): void {
    const activeTask = this._allTasks.find((task) => task.name === taskname);
    if (activeTask) {
      this._activeTask = activeTask;
      this._statusBarItem.text = 'TaskMarks: ' + this._activeTask.name;
      this._statusBarItem.show();
    } else {
      this._statusBarItem.hide();
      this.useActiveTask();
    }
  }

  addTask(task: IPersistTask): void {
    const current = this.useActiveTask(task.name);
    current.mergeWith(task);
  }

  useActiveTask(taskname = 'default'): Task {
    let task = this._allTasks.find((task) => task.name === taskname);

    if (!task) {
      task = new Task(taskname);
      this._allTasks.push(task);
    }

    this.setActiveTask(task.name);

    // this.dumpToLog();
    return task;
  }

  delete(taskname: string): Task {
    const found = this._allTasks.findIndex((task) => task.name === taskname);

    if (found > -1) {
      this._allTasks.splice(found, 1);
    }

    return this.useActiveTask();
  }

  // TODO NK - next ToDos are for nextMark, previousMark, nextDocument and previousDocument
  // TODO NK - check: can I use activeFile and current position instead of activeTask.activeFile to go on
  // TODO NK - check: can activeTask be null
  nextMark(activeFile: string, currentline: number): void {
    const activeTask = this.activeTask;
    if (
      activeTask == null ||
      activeTask.files == null ||
      activeTask.files.length === 0 ||
      activeTask.activeFile == null
    ) {
      return;
    }

    for (let mark of activeTask.activeFile.lineNumbers) {
      if (mark > currentline) {
        DecoratorHelper.showLine(mark);
        return;
      }
    }

    this.nextDocument();
  }

  previousMark(activeFile: string, currentline: number): void {
    const activeTask = this.activeTask;
    if (!activeTask || !activeTask.files || activeTask.files.length === 0) {
      return;
    }

    if (!activeTask.activeFile) {
      return;
    }
    for (
      let index = activeTask.activeFile.lineNumbers.length - 1;
      index > -1;
      index--
    ) {
      const mark = activeTask.activeFile.lineNumbers[index];

      if (mark < currentline) {
        DecoratorHelper.showLine(mark);
        return;
      }
    }

    this.previousDocument();
  }

  nextDocument(): void {
    if (!this.activeTask || this.activeTask.files.length === 0) {
      return;
    }

    let currentFile = this.activeTask.activeFile;
    let nextFile = this.activeTask.files.next;
    while (currentFile !== nextFile) {
      if (nextFile && nextFile.lineNumbers && nextFile.lineNumbers.length > 0) {
        currentFile = nextFile;
      } else {
        nextFile = this.activeTask.files.next;
      }
    }
    if (currentFile) {
      DecoratorHelper.openAndShow(
        currentFile.filepath,
        currentFile.lineNumbers[0]
      );
    }
  }

  previousDocument(): void {
    if (!this.activeTask || this.activeTask.files.length === 0) {
      return;
    }

    let currentFile = this.activeTask.activeFile;
    let previousFile = this.activeTask.files.previous;
    while (currentFile !== previousFile) {
      if (
        previousFile &&
        previousFile.lineNumbers &&
        previousFile.lineNumbers.length > 0
      ) {
        currentFile = previousFile;
      } else {
        previousFile = this.activeTask.files.next;
      }
    }
    if (currentFile) {
      DecoratorHelper.openAndShow(
        currentFile.filepath,
        currentFile.lineNumbers[0]
      );
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
