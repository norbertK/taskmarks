import { Task } from './Task';
import type { IPersistTask } from './types';
import type { LabelConflictChoice } from './core/labels';

export class TaskManager {
	private static _instance: TaskManager;

	static get instance(): TaskManager {
		return this._instance || (this._instance = new this());
	}

	private _activeTask: Task;
	private _allTasks: Task[];

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
		return true;
	}

	// makes the task with this name the active one, creates it if there is none
	useActiveTask(taskname = 'default'): Task {
		this._activeTask = this._addTaskByNameIfMissing(taskname);
		return this._activeTask;
	}

	// replaces all tasks, e.g. after taskmarks.json was loaded. The task objects are new: files have to be used again
	replaceTasks(persistTasks: IPersistTask[], activeTaskName: string): void {
		this._allTasks = [];
		persistTasks.forEach((persistTask) => this.addTask(persistTask));
		this.useActiveTask(activeTaskName);
	}

	// merges the marks into the task with that name, a new task if there is none
	addTask(iPersistTask: IPersistTask, labelConflict: LabelConflictChoice = 'keep'): void {
		const task = this._addTaskByNameIfMissing(iPersistTask.name);
		task.mergeFilesWithPersistFiles(iPersistTask, labelConflict);
	}

	// how many marks of the task have another label than the mark on that line in the task with the same name
	countLabelConflicts(iPersistTask: IPersistTask): number {
		return this._allTasks.find((task) => task.name === iPersistTask.name)?.countLabelConflicts(iPersistTask) ?? 0;
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

	private _addTaskByNameIfMissing(taskname: string): Task {
		let task = this._allTasks.find((task) => task.name === taskname);
		if (!task) {
			task = new Task(taskname);
			this._allTasks.push(task);
		}
		return task;
	}
}
