/**
 * Pure serialization logic - converts between in-memory and JSON format.
 * No VS Code or file system dependencies.
 */

import type { IPersistFile, IPersistMark, IPersistTask, IPersistTaskManager } from '../types';

export interface SerializableFile {
	filepath: string;
	marks: Array<{ lineNumber: number; label: string }>;
}

export interface SerializableTask {
	name: string;
	files: SerializableFile[];
}

export interface SerializableTaskManager {
	activeTaskName: string;
	tasks: SerializableTask[];
}

/**
 * Convert a task to its persist format.
 * The fileExistsCheck callback allows the caller to inject file existence checking.
 */
export function taskToPersistTask(
	task: SerializableTask,
	fileExistsCheck: (filepath: string) => boolean = () => true
): IPersistTask {
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
	const persistTaskManager: IPersistTaskManager = {
		activeTaskName,
		persistTasks: tasks.map((t) => taskToPersistTask(t, fileExistsCheck)),
	};
	return JSON.stringify(persistTaskManager, null, '  ');
}

/**
 * Parse JSON string to persist format.
 * Returns null if invalid or old format.
 */
export function parseTaskmarksJson(json: string): IPersistTaskManager | null {
	try {
		const parsed = JSON.parse(json);

		// Check for old format
		if (parsed.persistTasks === undefined || json.indexOf('"lineNumbers": [') > -1) {
			return null;
		}

		return parsed as IPersistTaskManager;
	} catch {
		return null;
	}
}

/**
 * Normalize file paths in persist data (convert path separators).
 */
export function normalizeFilePaths(
	persistTaskManager: IPersistTaskManager,
	fromChar: string,
	toChar: string
): IPersistTaskManager {
	return {
		...persistTaskManager,
		persistTasks: persistTaskManager.persistTasks.map((task) => ({
			...task,
			persistFiles: task.persistFiles.map((file) => ({
				...file,
				filepath: file.filepath.replaceAll(fromChar, toChar),
			})),
		})),
	};
}

/**
 * Create default taskmarks JSON for a new file.
 */
export function createDefaultTaskmarksJson(taskName = 'default'): string {
	return JSON.stringify(
		{
			activeTaskName: taskName,
			persistTasks: [{ name: taskName, persistFiles: [] }],
		},
		null,
		'  '
	);
}
