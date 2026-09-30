import * as vscode from 'vscode';

import type { IPersistFile, IPersistMark, IPersistTask, IPersistTaskManager } from './types';
import { PathHelper } from './PathHelper';
import { TaskManager } from './TaskManager';
import { Task } from './Task';
import { parseTaskmarksJson, normalizeFilePaths, taskToPersistTask, type SerializableTask } from './core/serialization';

export abstract class Persist {
	private static _taskManager: TaskManager;
	private static _lastSavedTaskmarksJson: string;

	static initAndLoad(taskManager: TaskManager, context: vscode.ExtensionContext): void {
		this._taskManager = taskManager;
		const taskmarksJson = PathHelper.getTaskmarksJson(context);
		Persist._lastSavedTaskmarksJson = taskmarksJson;

		const parsed = parseTaskmarksJson(taskmarksJson);
		if (parsed === null) {
			// old version or invalid - start fresh
			const oldParsed = JSON.parse(taskmarksJson);
			const taskName = oldParsed.activeTaskName ? oldParsed.activeTaskName : 'default';
			taskManager.useActiveTask(taskName);
			Persist.saveTaskmarksJson();
			return;
		}

		const normalized = normalizeFilePaths(parsed, PathHelper.inactivePathChar, PathHelper.activePathChar);
		normalized.persistTasks.forEach((persistTask) => {
			taskManager.addTask(persistTask);
		});

		if (taskManager.activeTask.name !== normalized.activeTaskName) {
			taskManager.useActiveTask(normalized.activeTaskName);
		}
	}

	static saveTaskmarksJson(): void {
		if (!this._taskManager.activeTask) {
			console.log('no active task? - should never happen!');
			return;
		}
		if (PathHelper.taskmarksJsonIsNew) {
			if (this._taskManager.activeTask.name === 'default' && !this._taskManager.activeTask.hasMarks) {
				return;
			}
		}
		PathHelper.checkTaskmarksDataFilePath();

		const persistTaskManager: IPersistTaskManager = {
			activeTaskName: this._taskManager.activeTask.name,
			persistTasks: [],
		};
		this._taskManager.allTasks.forEach((task) => {
			const persistTask: IPersistTask = this.copyTaskToPersistTask(task);
			persistTaskManager.persistTasks.push(persistTask);
		});

		const taskmarksJsonToBeSaved = JSON.stringify(persistTaskManager, null, '  ');
		if (Persist._lastSavedTaskmarksJson !== taskmarksJsonToBeSaved) {
			Persist._lastSavedTaskmarksJson = taskmarksJsonToBeSaved;
			PathHelper.saveTaskmarks(taskmarksJsonToBeSaved);
		}
	}

	static copyToClipboard(): void {
		if (!this._taskManager.activeTask) {
			throw new Error('no active task');
		}
		const persistTaskVersionOfActiveTask = this.copyTaskToPersistTask(this._taskManager.activeTask);

		const activeTaskString = JSON.stringify(persistTaskVersionOfActiveTask);

		vscode.env.clipboard.writeText(activeTaskString);
	}

	static pasteFromClipboard(): void {
		vscode.env.clipboard.readText().then((clip) => {
			let activeTaskString = clip;

			if (!activeTaskString) {
				vscode.window.showInformationMessage('Could not paste Task from Clipboard.');
				return;
			}

			try {
				const persistedTask = <IPersistTask>JSON.parse(activeTaskString);

				this._taskManager.addTask(persistedTask);

				this.saveTaskmarksJson();
			} catch (error) {
				vscode.window.showInformationMessage('PasteFromClipboard failed with ' + error);
			}
		});
	}

	static copyTaskToPersistTask(task: Task): IPersistTask {
		const serializableTask: SerializableTask = {
			name: task.name,
			files: task.files
				.filter((file) => file && file.filepath && file.lineNumbers)
				.map((file) => ({
					filepath: file.filepath,
					marks: file.allPersistMarks,
				})),
		};
		return taskToPersistTask(serializableTask, PathHelper.fileExists);
	}
}
