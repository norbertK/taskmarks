import * as vscode from 'vscode';

import type { IPersistTask } from './types';
import { PathHelper } from './PathHelper';
import { TaskManager } from './TaskManager';
import { Task } from './Task';
import { normalizeFilePaths, normalizeTaskFilePaths, serializeTaskManager, taskToPersistTask, type SerializableTask } from './core/serialization';
import { CURRENT_VERSION, loadTaskmarksJson, upgradeTask } from './core/migration';

export abstract class Persist {
	private static _taskManager: TaskManager;
	private static _lastSavedTaskmarksJson: string;
	private static _readOnly = false;

	static initAndLoad(taskManager: TaskManager, context: vscode.ExtensionContext): void {
		this._taskManager = taskManager;
		Persist._readOnly = false;
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

	// throws if the file can't be written - the next call tries again
	static saveTaskmarksJson(): void {
		if (Persist._readOnly) {
			return;
		}
		const activeTask = this._taskManager.activeTask;
		if (PathHelper.taskmarksJsonIsNew && activeTask.name === 'default' && !activeTask.hasMarks) {
			return;
		}

		const taskmarksJsonToBeSaved = serializeTaskManager(
			activeTask.name,
			this._taskManager.allTasks.map((task) => Persist.toSerializableTask(task))
		);
		if (Persist._lastSavedTaskmarksJson === taskmarksJsonToBeSaved) {
			return;
		}
		PathHelper.checkTaskmarksDataFilePath();
		PathHelper.saveTaskmarks(taskmarksJsonToBeSaved);
		Persist._lastSavedTaskmarksJson = taskmarksJsonToBeSaved;
	}

	static copyToClipboard(): void {
		const activeTaskString = JSON.stringify(this.copyTaskToPersistTask(this._taskManager.activeTask));
		Persist.writeClipboard(activeTaskString);
	}

	// merges the task on the clipboard into the task with the same name (a new task, if there is none)
	// true if a task was pasted - the caller has to save and to refresh the editor
	static async pasteFromClipboard(): Promise<boolean> {
		const clip = await Persist.readClipboard();
		const persistedTask = Persist.parseTask(clip);
		if (!persistedTask) {
			vscode.window.showInformationMessage('Taskmarks: the clipboard does not contain a Taskmarks task.');
			return false;
		}

		// the task may have been copied on a system with the other path separator
		this._taskManager.addTask(normalizeTaskFilePaths(persistedTask, PathHelper.inactivePathChar, PathHelper.activePathChar));
		vscode.window.showInformationMessage(`Taskmarks: task '${persistedTask.name}' pasted from the clipboard.`);
		return true;
	}

	// own methods, because vscode.env.clipboard is read-only in a real VS Code and can't be replaced in tests
	static readClipboard(): Thenable<string> {
		return vscode.env.clipboard.readText();
	}

	static writeClipboard(text: string): Thenable<void> {
		return vscode.env.clipboard.writeText(text);
	}

	// marks of files that don't exist here are kept: the file may exist for a teammate or on another branch
	static copyTaskToPersistTask(task: Task): IPersistTask {
		return taskToPersistTask(Persist.toSerializableTask(task));
	}

	private static toSerializableTask(task: Task): SerializableTask {
		return {
			name: task.name,
			files: task.files.map((file) => ({ filepath: file.filepath, marks: file.allPersistMarks })),
		};
	}

	// a task in any known format (it may have been copied by an older version), undefined for anything else
	private static parseTask(text: string): IPersistTask | undefined {
		try {
			return upgradeTask(JSON.parse(text));
		} catch {
			return undefined;
		}
	}
}
