/**
 * Pure serialization logic - converts between in-memory and JSON format.
 * No VS Code or file system dependencies.
 */

import type { IPersistBreakpoint, IPersistFile, IPersistMark, IPersistTask, IPersistTaskManager } from '../types';
import { sortBreakpoints } from './breakpoints';
import { VERSION_WITHOUT_BREAKPOINTS, versionToWrite } from './migration';

export interface SerializableFile {
	filepath: string;
	marks: Array<{ lineNumber: number; label: string }>;
}

export interface SerializableTask {
	name: string;
	files: SerializableFile[];
	// the breakpoints the task shares with the team
	breakpoints?: IPersistBreakpoint[];
}

export interface SerializableTaskManager {
	activeTaskName: string;
	tasks: SerializableTask[];
}

/**
 * Convert a task to its persist format.
 * The fileExistsCheck callback allows the caller to inject file existence checking.
 */
export function taskToPersistTask(task: SerializableTask, fileExistsCheck: (filepath: string) => boolean = () => true): IPersistTask {
	const persistTask: IPersistTask = {
		name: task.name,
		persistFiles: [],
	};

	for (const file of task.files) {
		if (file.filepath && file.marks.length > 0 && fileExistsCheck(file.filepath)) {
			const persistMarks: IPersistMark[] = file.marks
				.map((m) => ({ lineNumber: m.lineNumber, label: m.label }))
				.sort((a, b) => a.lineNumber - b.lineNumber);

			const persistFile: IPersistFile = {
				filepath: file.filepath,
				persistMarks,
			};
			persistTask.persistFiles.push(persistFile);
		}
	}

	// no field without breakpoints: the file stays what an older Taskmarks version writes
	if (task.breakpoints && task.breakpoints.length > 0) {
		persistTask.persistBreakpoints = sortBreakpoints(task.breakpoints);
	}

	return persistTask;
}

/**
 * Convert persist format back to in-memory task format.
 */
export function persistTaskToTask(persistTask: IPersistTask): SerializableTask {
	return {
		name: persistTask.name,
		files: persistTask.persistFiles.map((pf) => ({
			filepath: pf.filepath,
			marks: pf.persistMarks.map((pm) => ({
				lineNumber: pm.lineNumber,
				label: pm.label,
			})),
		})),
		...(persistTask.persistBreakpoints ? { breakpoints: persistTask.persistBreakpoints } : {}),
	};
}

/**
 * Serialize task manager to JSON string.
 */
export function serializeTaskManager(
	activeTaskName: string,
	tasks: SerializableTask[],
	fileExistsCheck: (filepath: string) => boolean = () => true
): string {
	const persistTasks = tasks.map((t) => taskToPersistTask(t, fileExistsCheck));
	const persistTaskManager: IPersistTaskManager = {
		version: versionToWrite(persistTasks),
		activeTaskName,
		persistTasks,
	};
	return JSON.stringify(persistTaskManager, null, '  ');
}

/**
 * Normalize file paths in persist data (convert path separators).
 */
export function normalizeFilePaths(persistTaskManager: IPersistTaskManager, fromChar: string, toChar: string): IPersistTaskManager {
	return {
		...persistTaskManager,
		persistTasks: persistTaskManager.persistTasks.map((task) => normalizeTaskFilePaths(task, fromChar, toChar)),
	};
}

/**
 * Normalize file paths of a single task (convert path separators).
 */
export function normalizeTaskFilePaths(persistTask: IPersistTask, fromChar: string, toChar: string): IPersistTask {
	return {
		...persistTask,
		persistFiles: persistTask.persistFiles.map((file) => ({
			...file,
			filepath: file.filepath.replaceAll(fromChar, toChar),
		})),
		...(persistTask.persistBreakpoints
			? {
					persistBreakpoints: persistTask.persistBreakpoints.map((breakpoint) => ({
						...breakpoint,
						filepath: breakpoint.filepath.replaceAll(fromChar, toChar),
					})),
				}
			: {}),
	};
}

/**
 * The path separator the file paths of a taskmarks.json are written with: the one more paths use.
 * undefined if no path has a separator (or both are used equally often) - the caller picks one.
 */
export function detectFileSeparator(persistTaskManager: IPersistTaskManager): '/' | '\\' | undefined {
	let slashes = 0;
	let backslashes = 0;
	for (const task of persistTaskManager.persistTasks) {
		for (const file of task.persistFiles) {
			if (file.filepath.includes('/')) {
				slashes++;
			}
			if (file.filepath.includes('\\')) {
				backslashes++;
			}
		}
	}
	if (slashes === backslashes) {
		return undefined;
	}
	return slashes > backslashes ? '/' : '\\';
}

/**
 * Create default taskmarks JSON for a new file.
 */
export function createDefaultTaskmarksJson(taskName = 'default'): string {
	return JSON.stringify(
		{
			version: VERSION_WITHOUT_BREAKPOINTS,
			activeTaskName: taskName,
			persistTasks: [{ name: taskName, persistFiles: [] }],
		},
		null,
		'  '
	);
}
