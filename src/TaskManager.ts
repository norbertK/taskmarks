import { Task } from './Task';
import { DecoratorHelper } from './DecoratorHelper';
import * as vscode from 'vscode';
import type { IPersistTask } from './types';

export class TaskManager {
  private static _instance: TaskManager;

  static get instance(): TaskManager {
    console.log('TaskManager get instance()');
    if (this._instance == null) {
      console.log('TaskManager get instance() new TaskManager()');
      this._instance = new TaskManager();
    }

    return this._instance;
  }

  allTasks: Task[];

  private _activeTask: Task;
  private _statusBarItem: vscode.StatusBarItem;

  private constructor() {
    this.allTasks = [];
    this._statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right
    );
    this._activeTask = this.useActiveTask();
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

  // ToDoNK - next ToDos are for nextMark, previousMark, nextDocument and previousDocument
  // ToDoNK - check: can I use activeFile and current position instead of activeTask.activeFile to go on
  // ToDoNK - check: can activeTask be null
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

    for (let mark of activeTask.activeFile.lineNumbers) {
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

  nextDocument() {
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

  previousDocument() {
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
