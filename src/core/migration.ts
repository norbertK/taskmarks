/**
 * Versioning and upgrade of taskmarks.json - no VS Code or file system dependencies.
 *
 * Known formats:
 * - v0 (2018 - 0.8.21, no version field) - three variants, all with workspace-relative paths:
 *     { activeTaskName, tasks: [{ name, files: [{ filepath, marks: number[] }] }] }            (2018 - 0.8.13)
 *     { activeTaskName, tasks: [{ name, files: [{ filepath, lineNumbers: number[] }] }] }      (0.8.17)
 *     { activeTaskName, persistTasks: [{ name, persistFiles: [{ filepath, lineNumbers }] }] }  (0.8.21)
 * - v1 (0.8.23 - 1.0.0, no version field): marks with labels
 *     { activeTaskName, persistTasks: [{ name, persistFiles: [{ filepath, persistMarks: [{ lineNumber, label }] }] }] }
 * - v2 (1.0.1): v1 plus "version": 2
 */

import type { IPersistFile, IPersistMark, IPersistTask, IPersistTaskManager } from '../types';

export const CURRENT_VERSION = 2;

export type LoadResult =
	| { status: 'ok'; data: IPersistTaskManager; fromVersion: number }
	| { status: 'newer'; data: IPersistTaskManager; fromVersion: number }
	| { status: 'invalid'; reason: string };

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function toMark(value: unknown): IPersistMark | undefined {
	if (typeof value === 'number') {
		return Number.isInteger(value) && value >= 0 ? { lineNumber: value, label: '' } : undefined;
	}
	if (isObject(value) && typeof value.lineNumber === 'number' && Number.isInteger(value.lineNumber) && value.lineNumber >= 0) {
		return { lineNumber: value.lineNumber, label: typeof value.label === 'string' ? value.label : '' };
	}
	return undefined;
}

function toFile(value: unknown): IPersistFile | undefined {
	if (!isObject(value) || typeof value.filepath !== 'string' || value.filepath === '') {
		return undefined;
	}
	const rawMarks = value.persistMarks ?? value.lineNumbers ?? value.marks;
	const persistMarks = asArray(rawMarks)
		.map(toMark)
		.filter((mark): mark is IPersistMark => mark !== undefined);
	return { filepath: value.filepath, persistMarks };
}

/**
 * Convert a single task in any known format (v0, v1, v2) to the current task format.
 * Also used for tasks pasted from the clipboard, which may come from an older version.
 */
export function upgradeTask(value: unknown): IPersistTask | undefined {
	if (!isObject(value) || typeof value.name !== 'string' || value.name === '') {
		return undefined;
	}
	const persistFiles = asArray(value.persistFiles ?? value.files)
		.map(toFile)
		.filter((file): file is IPersistFile => file !== undefined);
	return { name: value.name, persistFiles };
}

export function detectVersion(raw: Json): number {
	if (typeof raw.version === 'number') {
		return raw.version;
	}
	const tasks = asArray(raw.persistTasks);
	const usesV1Marks =
		raw.persistTasks !== undefined &&
		tasks.every((task) => !isObject(task) || asArray(task.persistFiles).every((file) => !isObject(file) || file.lineNumbers === undefined));
	return usesV1Marks ? 1 : 0;
}

/**
 * Parse taskmarks.json content of any known version into the current format.
 * A file written by a newer version is loaded as far as its fields are known; the caller should not overwrite it.
 */
export function loadTaskmarksJson(json: string): LoadResult {
	let raw: unknown;
	try {
		raw = JSON.parse(json);
	} catch (error) {
		return { status: 'invalid', reason: `not valid JSON (${error instanceof Error ? error.message : String(error)})` };
	}
	if (!isObject(raw)) {
		return { status: 'invalid', reason: 'expected a JSON object' };
	}

	const fromVersion = detectVersion(raw);
	const persistTasks = asArray(raw.persistTasks ?? raw.tasks)
		.map(upgradeTask)
		.filter((task): task is IPersistTask => task !== undefined);
	if (persistTasks.length === 0) {
		persistTasks.push({ name: 'default', persistFiles: [] });
	}

	const requestedActive = typeof raw.activeTaskName === 'string' ? raw.activeTaskName : '';
	const activeTaskName = persistTasks.some((task) => task.name === requestedActive) ? requestedActive : persistTasks[0].name;

	const data: IPersistTaskManager = { version: CURRENT_VERSION, activeTaskName, persistTasks };
	return { status: fromVersion > CURRENT_VERSION ? 'newer' : 'ok', data, fromVersion };
}
