import { Task } from './Task';
import { DecoratorHelper } from './DecoratorHelper';
import * as vscode from 'vscode';
import type { IPersistTask } from './types';
import { findNextFileWithMarks, findNextMark, findPreviousFileWithMarks, findPreviousMark } from './core/navigation';

export class TaskManager {
	private static _instance: TaskManager;

	static get instance(): TaskManager {
		return this._instance || (this._instance = new this());
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

	private constructor() {
		this._allTasks = [];
		this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
		this._activeTask = this.useActiveTask();
	}

	// false if another task already has the new name - tasks are found by their name, so it has to be unique
	renameTask(oldTaskName: string, newTaskName: string): boolean {
		const task = this._allTasks.find((task) => task.name === oldTaskName);
		if (!task) {
			throw new Error('should not happen - picked from list');
		}
		const taskWithNewName = this._allTasks.find((task) => task.name === newTaskName);
		if (taskWithNewName && taskWithNewName !== task) {
			return false;
		}

		task.name = newTaskName;
		this._showActiveTaskInStatusBar();
		return true;
	}

	// makes the task with this name the active one, creates it if there is none
	useActiveTask(taskname = 'default'): Task {
		const task = this._addTaskByNameIfMissing(taskname);
		if (task !== this._activeTask) {
			this._activeTask = task;
			this._showActiveTaskInStatusBar();
		}
		return task;
	}

	// replaces all tasks, e.g. after taskmarks.json was loaded. The task objects are new: files have to be used again
	replaceTasks(persistTasks: IPersistTask[], activeTaskName: string): void {
		this._allTasks = [];
		persistTasks.forEach((persistTask) => this.addTask(persistTask));
		this.useActiveTask(activeTaskName);
	}

	addTask(iPersistTask: IPersistTask): void {
		const task = this._addTaskByNameIfMissing(iPersistTask.name);
		task.mergeFilesWithPersistFiles(iPersistTask);
	}

	// after deleting the active task, the default task is active - a new, empty one if the default task itself was deleted
	delete(nameOfTaskToDelete: string): void {
		const found = this._allTasks.findIndex((taskToDelete) => taskToDelete.name === nameOfTaskToDelete);

		if (found > -1) {
			this._allTasks.splice(found, 1);
		}

		if (!this._allTasks.includes(this._activeTask)) {
			this.useActiveTask();
		}
	}

	nextMark(currentline: number): void {
		const activeFile = this.activeTask.activeFile;
		if (!activeFile) {
			return;
		}

		const nextLine = findNextMark(currentline, activeFile.lineNumbers);
		if (nextLine !== undefined) {
			DecoratorHelper.showLine(nextLine);
		} else {
			this.nextDocument();
		}
	}

	previousMark(currentline: number): void {
		const activeFile = this.activeTask.activeFile;
		if (!activeFile) {
			return;
		}

		const prevLine = findPreviousMark(currentline, activeFile.lineNumbers);
		if (prevLine !== undefined) {
			DecoratorHelper.showLine(prevLine);
		} else {
			this.previousDocument();
		}
	}

	nextDocument(): void {
		const target = findNextFileWithMarks(this.activeTask.files, this._activeFileIndex());
		if (target) {
			DecoratorHelper.openAndShow(target.filepath, target.lineNumber);
		}
	}

	previousDocument(): void {
		const target = findPreviousFileWithMarks(this.activeTask.files, this._activeFileIndex());
		if (target) {
			DecoratorHelper.openAndShow(target.filepath, target.lineNumber);
		}
	}

	// -1 if there is no active file or it is not (or no longer) part of the task
	private _activeFileIndex(): number {
		const activeFile = this.activeTask.activeFile;
		return activeFile ? this.activeTask.files.indexOf(activeFile) : -1;
	}

	private _showActiveTaskInStatusBar(): void {
		this._statusBarItem.text = 'TaskMarks: ' + this._activeTask.name;
		this._statusBarItem.show();
	}

	private _addTaskByNameIfMissing(taskname: string): Task {
		let task = this._allTasks.find((task) => task.name === taskname);
		if (!task) {
			task = new Task(taskname);
			this._allTasks.push(task);
		}
		return task;
	}
}
