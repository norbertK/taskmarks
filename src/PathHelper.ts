import * as vscode from 'vscode';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import { IPersistTaskManager } from './types';
import { detectPathCharacters, getFullPath as coreGetFullPath, reducePath as coreReducePath } from './core/paths';
import { createDefaultTaskmarksJson } from './core/serialization';

export abstract class PathHelper {
	private static _basePath = '';

	private static _taskmarksDataFilePath: string;
	private static _activePathChar: string;
	private static _inactivePathChar: string;
	private static _taskmarksJsonIsNew = false;

	static get taskmarksDataFilePath(): string {
		return this._taskmarksDataFilePath;
	}

	static get activePathChar(): string {
		return this._activePathChar;
	}

	static get inactivePathChar(): string {
		return this._inactivePathChar;
	}

	static get basePath(): string {
		return this._basePath;
	}

	static set basePath(basePath: string) {
		this._basePath = basePath;
	}

	static get taskmarksJsonIsNew(): boolean {
		return this._taskmarksJsonIsNew;
	}

	static initTaskmarksDataFilePath(context: vscode.ExtensionContext): void {
		if (!this._taskmarksDataFilePath) {
			// first check local path
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (workspaceFolders === undefined || workspaceFolders.length === 0) {
				throw new Error('Error loading vscode.workspace! Stop!');
			}
			this._taskmarksDataFilePath = join(workspaceFolders[0].uri.fsPath, '.vscode', 'taskmarks.json');

			const pathChars = detectPathCharacters(this._taskmarksDataFilePath);
			PathHelper._activePathChar = pathChars.active;
			PathHelper._inactivePathChar = pathChars.inactive;
			// is there already something -> keep using it
			if (existsSync(this._taskmarksDataFilePath)) {
				return;
			}
			// otherwise (nothing there) let´s check useGlobalTaskmarksJson
			const useGlobalTaskmarksJson = vscode.workspace.getConfiguration().get<boolean>('taskmarks.useGlobalTaskmarksJson');

			if (!useGlobalTaskmarksJson) {
				return;
			}

			// let´s use the global path instead
			this._taskmarksDataFilePath = join(context.globalStorageUri.fsPath, 'taskmarks.json');
		}
	}

	static checkTaskmarksDataFilePath(): void {
		const taskmarksDataFilePath = PathHelper.taskmarksDataFilePath;
		if (!taskmarksDataFilePath) {
			throw new Error('missing location of Taskmarks.json');
		}
		if (!existsSync(dirname(taskmarksDataFilePath))) {
			mkdirSync(dirname(taskmarksDataFilePath));
		}
	}

	static fileExists(filepath: string) {
		return existsSync(PathHelper.getFullPath(filepath));
	}

	static saveTaskmarks(taskmarksJsonToBeSaved: string) {
		this._taskmarksJsonIsNew = false;
		const taskmarksDataFilePath = PathHelper.taskmarksDataFilePath;
		writeFileSync(taskmarksDataFilePath, taskmarksJsonToBeSaved);
	}

	static getFullPath(filepath: string): string {
		return coreGetFullPath(PathHelper.basePath, filepath);
	}

	static reducePath(filepath: string): string {
		return coreReducePath(PathHelper.basePath, filepath);
	}

	static getTaskmarksJson(context: vscode.ExtensionContext): string {
		PathHelper.initTaskmarksDataFilePath(context);
		const fileFound = existsSync(PathHelper._taskmarksDataFilePath);

		if (PathHelper._taskmarksDataFilePath === undefined || !fileFound) {
			this._taskmarksJsonIsNew = true;
			return createDefaultTaskmarksJson();
		}
		return readFileSync(PathHelper._taskmarksDataFilePath).toString();
	}

	/** Writes taskmarks.json.<suffix>.bak next to taskmarks.json, keeping an existing backup. Returns the backup path. */
	static writeBackup(suffix: string, content: string): string {
		const backupPath = `${PathHelper.taskmarksDataFilePath}.${suffix}.bak`;
		if (!existsSync(backupPath)) {
			writeFileSync(backupPath, content);
		}
		return backupPath;
	}

	static replaceAll(theString: string, old: string, newString: string): string {
		return theString.replaceAll(old, newString);
	}
}
