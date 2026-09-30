import * as vscode from 'vscode';

import type { IPersistFile, IPersistMark, IPersistTask, IPersistTaskManager } from './types';
import { PathHelper } from './PathHelper';
import { TaskManager } from './TaskManager';
import { Task } from './Task';
import { normalizeFilePaths, taskToPersistTask, type SerializableTask } from './core/serialization';
import { CURRENT_VERSION, loadTaskmarksJson, upgradeTask } from './core/migration';

export abstract class Persist {
	private static _taskManager: TaskManager;
	private static _lastSavedTaskmarksJson: string;
	private static _readOnly = false;

	static initAndLoad(taskManager: TaskManager, context: vscode.ExtensionContext): void {
		this._taskManager = taskManager;
		const taskmarksJson = PathHelper.getTaskmarksJson(context);
		Persist._lastSavedTaskmarksJson = taskmarksJson;

		const result = loadTaskmarksJson(taskmarksJson);

		if (result.status === 'invalid') {
			const backupPath = PathHelper.writeBackup('invalid', taskmarksJson);
			vscode.window.showWarningMessage(`Taskmarks: taskmarks.json could not be read (${result.reason}). Starting empty; the old file was saved as ${backupPath}.`);
			taskManager.useActiveTask('default');
			return;
		}

		if (result.status === 'newer') {
			Persist._readOnly = true;
			vscode.window.showWarningMessage(
				`Taskmarks: taskmarks.json was written by a newer Taskmarks version (file format ${result.fromVersion}, this version knows ${CURRENT_VERSION}). Marks are loaded, but changes will not be saved. Please update the extension.`
			);
		} else if (result.fromVersion < CURRENT_VERSION && !PathHelper.taskmarksJsonIsNew) {
			PathHelper.writeBackup(`v${result.fromVersion}`, taskmarksJson);
		}

		const normalized = normalizeFilePaths(result.data, PathHelper.inactivePathChar, PathHelper.activePathChar);
		normalized.persistTasks.forEach((persistTask) => {
			taskManager.addTask(persistTask);
		});

		if (taskManager.activeTask.name !== normalized.activeTaskName) {
			taskManager.useActiveTask(normalized.activeTaskName);
		}
	}

	static saveTaskmarksJson(): void {
		if (Persist._readOnly) {
			return;
		}
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
			version: CURRENT_VERSION,
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
				const persistedTask = upgradeTask(JSON.parse(activeTaskString));
				if (!persistedTask) {
					vscode.window.showInformationMessage('The clipboard does not contain a Taskmarks task.');
					return;
				}

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
