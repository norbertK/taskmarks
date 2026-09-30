import { Task } from './Task';
import { DecoratorHelper } from './DecoratorHelper';
import * as vscode from 'vscode';
import type { IPersistTask } from './types';
import { findNextMark, findPreviousMark } from './core/navigation';

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

	renameTask(oldTaskName: string, newTaskName: string): void {
		let task = this._allTasks.find((task) => task.name === oldTaskName);
		if (!task) {
			throw new Error('should not happen - picked from list');
		}

		task.name = newTaskName;

		this._statusBarItem.text = 'TaskMarks: ' + this._activeTask.name;
		this._statusBarItem.show();
	}

	useActiveTask(taskname = 'default'): Task {
		if (this.activeTask && this.activeTask.name === taskname) {
			return this.activeTask;
		}

		let task = this._addTaskByNameIfMissing(taskname);

		this._statusBarItem.hide();
		this._activeTask = task;
		this._statusBarItem.text = 'TaskMarks: ' + this._activeTask.name;
		this._statusBarItem.show();

		return task;
	}

	addTask(iPersistTask: IPersistTask): void {
		const task = this._addTaskByNameIfMissing(iPersistTask.name);
		task.mergeFilesWithPersistFiles(iPersistTask);
	}

	delete(nameOfTaskToDelete: string): Task {
		const found = this._allTasks.findIndex((taskToDelete) => taskToDelete.name === nameOfTaskToDelete);

		if (found > -1) {
			this._allTasks.splice(found, 1);
		}

		if (this._activeTask.name === nameOfTaskToDelete) {
			return this.useActiveTask();
		}

		return this._activeTask;
	}

	nextMark(currentline: number): void {
		if (
			this.activeTask === undefined ||
			this.activeTask.files === undefined ||
			this.activeTask.files.length === 0 ||
			this.activeTask.activeFile === undefined
		) {
			return;
		}

		const nextLine = findNextMark(currentline, this.activeTask.activeFile.lineNumbers);
		if (nextLine !== undefined) {
			DecoratorHelper.showLine(nextLine);
		} else {
			this.nextDocument();
		}
	}

	previousMark(currentline: number): void {
		if (!this.activeTask || !this.activeTask.files || this.activeTask.files.length === 0) {
			return;
		}

		if (!this.activeTask.activeFile) {
			return;
		}

		const prevLine = findPreviousMark(currentline, this.activeTask.activeFile.lineNumbers);
		if (prevLine !== undefined) {
			DecoratorHelper.showLine(prevLine);
		} else {
			this.previousDocument();
		}
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
			DecoratorHelper.openAndShow(currentFile.filepath, currentFile.lineNumbers[0]);
		}
	}

	previousDocument(): void {
		if (!this.activeTask || this.activeTask.files.length === 0) {
			return;
		}

		let currentFile = this.activeTask.activeFile;
		let previousFile = this.activeTask.files.previous;
		while (currentFile !== previousFile) {
			if (previousFile && previousFile.lineNumbers && previousFile.lineNumbers.length > 0) {
				currentFile = previousFile;
			} else {
				previousFile = this.activeTask.files.previous;
			}
		}
		if (currentFile) {
			DecoratorHelper.openAndShow(currentFile.filepath, currentFile.lineNumbers[currentFile.lineNumbers.length - 1]);
		}
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
