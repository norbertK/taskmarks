import * as vscode from 'vscode';

import type { IPersistTask, IPersistTaskManager } from './types';
import { PathHelper } from './PathHelper';
import { TaskManager } from './TaskManager';
import { Task } from './Task';
import {
	detectFileSeparator,
	normalizeFilePaths,
	normalizeTaskFilePaths,
	serializeTaskManager,
	taskToPersistTask,
	type SerializableTask,
} from './core/serialization';
import { CURRENT_VERSION, VERSION_WITHOUT_BREAKPOINTS, loadTaskmarksJson, upgradeTask } from './core/migration';
import type { LabelConflictChoice } from './core/labels';

export abstract class Persist {
	private static _taskManager: TaskManager;
	private static _lastSavedTaskmarksJson: string;
	private static _readOnly = false;
	// the file was changed outside of VS Code and can't be read: nothing is saved over it
	private static _fileUnreadable = false;
	// the tasks, serialized, when they were last loaded or saved - they have unsaved changes if they serialize differently now
	private static _syncedTaskmarksJson = '';
	// the path separator of the paths in taskmarks.json. In memory the paths have the separator of this system,
	// but the file keeps the one it has, or a team on Windows and macOS / Linux would rewrite all paths with every save
	private static _fileSeparator = '/';

	static initAndLoad(taskManager: TaskManager, context: vscode.ExtensionContext): void {
		this._taskManager = taskManager;
		Persist._readOnly = false;
		Persist._fileUnreadable = false;
		Persist._fileSeparator = '/';
		const taskmarksJson = PathHelper.getTaskmarksJson(context);
		Persist._lastSavedTaskmarksJson = taskmarksJson;

		const result = loadTaskmarksJson(taskmarksJson);

		if (result.status === 'invalid') {
			const backupPath = PathHelper.writeBackup('invalid', taskmarksJson);
			vscode.window.showWarningMessage(`Taskmarks: taskmarks.json could not be read (${result.reason}). Starting empty; the old file was saved as ${backupPath}.`);
			taskManager.useActiveTask('default');
			Persist._syncedTaskmarksJson = Persist.serialize();
			return;
		}

		Persist.useLoaded(result.status, result.fromVersion, result.data, taskmarksJson, result.data.activeTaskName);
	}

	// Call when taskmarks.json may have been changed by someone else (a git pull, an editor).
	// true if the tasks were replaced by the ones from the file - the caller has to refresh the editor.
	static async reloadIfChangedOnDisk(): Promise<boolean> {
		const taskmarksJson = PathHelper.readTaskmarksJson();
		// a deleted file is written again with the next save; our own writes are known
		if (taskmarksJson === undefined || taskmarksJson === Persist._lastSavedTaskmarksJson) {
			return false;
		}

		const result = loadTaskmarksJson(taskmarksJson);

		if (result.status === 'invalid') {
			// e.g. conflict markers after a pull: keep the tasks, and don't destroy what someone has to repair
			Persist._lastSavedTaskmarksJson = taskmarksJson;
			Persist._fileUnreadable = true;
			const overwrite = 'Overwrite with my bookmarks';
			const choice = await vscode.window.showWarningMessage(
				`Taskmarks: taskmarks.json was changed outside of VS Code and can't be read (${result.reason}). Your bookmarks stay as they are, but they are not saved until the file can be read again.`,
				overwrite
			);
			if (choice === overwrite && Persist._fileUnreadable && Persist._lastSavedTaskmarksJson === taskmarksJson) {
				PathHelper.writeBackup('invalid', taskmarksJson);
				Persist._fileUnreadable = false;
				Persist.saveTaskmarksJson();
			}
			return false;
		}

		const hadUnsavedChanges = !Persist._readOnly && Persist.serialize() !== Persist._syncedTaskmarksJson;
		Persist._fileUnreadable = false;
		if (hadUnsavedChanges) {
			// only after a save that failed or was held back - normally every change is saved at once
			const load = 'Load the file';
			const keep = 'Keep my bookmarks';
			const choice = await vscode.window.showWarningMessage(
				'Taskmarks: taskmarks.json was changed outside of VS Code, but there are bookmarks that are not saved yet.',
				load,
				keep
			);
			if (choice === keep) {
				Persist.saveTaskmarksJson();
			}
			if (choice !== load) {
				return false;
			}
		}

		// the file of a team carries the active task of whoever saved last - stay in the own one, if it still exists
		const ownActiveTaskName = this._taskManager.activeTask.name;
		const activeTaskName = result.data.persistTasks.some((task) => task.name === ownActiveTaskName) ? ownActiveTaskName : result.data.activeTaskName;
		Persist._lastSavedTaskmarksJson = taskmarksJson;
		Persist.useLoaded(result.status, result.fromVersion, result.data, taskmarksJson, activeTaskName);
		return true;
	}

	private static useLoaded(status: 'ok' | 'newer', fromVersion: number, data: IPersistTaskManager, taskmarksJson: string, activeTaskName: string): void {
		Persist._readOnly = status === 'newer';
		if (status === 'newer') {
			vscode.window.showWarningMessage(
				`Taskmarks: taskmarks.json was written by a newer Taskmarks version (file format ${fromVersion}, this version knows ${CURRENT_VERSION}). Marks are loaded, but changes will not be saved. Please update the extension.`
			);
		} else if (fromVersion < VERSION_WITHOUT_BREAKPOINTS && !PathHelper.taskmarksJsonIsNew) {
			// not for version 2: it is still written, unless breakpoints are shared - and they are only added to it
			PathHelper.writeBackup(`v${fromVersion}`, taskmarksJson);
		}

		Persist._fileSeparator = detectFileSeparator(data) ?? '/';
		const normalized = normalizeFilePaths(data, PathHelper.inactivePathChar, PathHelper.activePathChar);
		this._taskManager.replaceTasks(normalized.persistTasks, activeTaskName);
		Persist._syncedTaskmarksJson = Persist.serialize();
	}

	private static serialize(): string {
		return serializeTaskManager(
			this._taskManager.activeTask.name,
			this._taskManager.allTasks.map((task) => Persist.toSerializableTask(task, Persist._fileSeparator))
		);
	}

	// throws if the file can't be written - the next call tries again
	static saveTaskmarksJson(): void {
		if (Persist._readOnly) {
			return;
		}
		const activeTask = this._taskManager.activeTask;
		if (PathHelper.taskmarksJsonIsNew && activeTask.name === 'default' && !activeTask.hasMarks && activeTask.sharedBreakpoints.length === 0) {
			return;
		}

		const taskmarksJsonToBeSaved = Persist.serialize();
		if (Persist._lastSavedTaskmarksJson === taskmarksJsonToBeSaved || Persist._fileUnreadable) {
			return;
		}
		PathHelper.checkTaskmarksDataFilePath();
		PathHelper.saveTaskmarks(taskmarksJsonToBeSaved);
		Persist._lastSavedTaskmarksJson = taskmarksJsonToBeSaved;
		Persist._syncedTaskmarksJson = taskmarksJsonToBeSaved;
	}

	static copyToClipboard(): void {
		const activeTaskString = JSON.stringify(this.copyTaskToPersistTask(this._taskManager.activeTask));
		Persist.writeClipboard(activeTaskString);
	}

	// merges the task on the clipboard into the task with the same name (a new task, if there is none)
	// if marks on the same line have different labels, the user decides once for all of them - or cancels the paste
	// true if a task was pasted - the caller has to save and to refresh the editor
	static async pasteFromClipboard(): Promise<boolean> {
		const clip = await Persist.readClipboard();
		const persistedTask = Persist.parseTask(clip);
		if (!persistedTask) {
			vscode.window.showInformationMessage('Taskmarks: the clipboard does not contain a Taskmarks task.');
			return false;
		}

		// the task may have been copied on a system with the other path separator
		const pastedTask = normalizeTaskFilePaths(persistedTask, PathHelper.inactivePathChar, PathHelper.activePathChar);

		let labelConflict: LabelConflictChoice = 'keep';
		const conflicts = this._taskManager.countLabelConflicts(pastedTask);
		if (conflicts > 0) {
			// the first button is the default of a modal message
			const choices: Record<string, LabelConflictChoice> = { 'Combine': 'combine', 'Keep mine': 'keep', 'Take theirs': 'take' };
			const bookmarks = conflicts === 1 ? '1 bookmark has' : `${conflicts} bookmarks have`;
			const answer = await vscode.window.showInformationMessage(
				`Taskmarks: ${bookmarks} another label in the pasted task '${pastedTask.name}' than in yours.`,
				{ modal: true, detail: 'Combine puts both labels into one: "mine / theirs".' },
				...Object.keys(choices)
			);
			if (answer === undefined) {
				return false;
			}
			labelConflict = choices[answer];
		}

		this._taskManager.addTask(pastedTask, labelConflict);
		vscode.window.showInformationMessage(`Taskmarks: task '${pastedTask.name}' pasted from the clipboard.`);
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

	// with a separator the paths are written with it, without they keep the separator of this system
	private static toSerializableTask(task: Task, separator?: string): SerializableTask {
		const toPath = (filepath: string) => (separator ? filepath.replaceAll(PathHelper.activePathChar, separator) : filepath);
		return {
			name: task.name,
			files: task.files.map((file) => ({
				filepath: toPath(file.filepath),
				marks: file.allPersistMarks,
			})),
			breakpoints: task.sharedBreakpoints.map((breakpoint) => ({ ...breakpoint, filepath: toPath(breakpoint.filepath) })),
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
