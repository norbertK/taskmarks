import * as os from 'os';
import * as vscode from 'vscode';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import { dirname, join } from 'path';

import { IPersistTaskManager } from './types';

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

			if (this._taskmarksDataFilePath.indexOf('/') > -1) {
				// PathHelper._pathType = PathType.unixLike;
				PathHelper._activePathChar = '/';
				PathHelper._inactivePathChar = '\\';
			} else {
				// PathHelper._pathType = PathType.windowsLike;
				PathHelper._activePathChar = '\\';
				PathHelper._inactivePathChar = '/';
			}
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
		const pathWithBasePath = PathHelper.basePath + filepath;
		return pathWithBasePath;
	}

	static reducePath(filepath: string): string {
		let reducedPath = filepath;
		if (filepath.startsWith(this.basePath)) {
			reducedPath = filepath.substring(this._basePath.length);
		}
		return reducedPath;
	}

	static getTaskmarksJson(context: vscode.ExtensionContext): string {
		PathHelper.initTaskmarksDataFilePath(context);
		const fileFound = existsSync(PathHelper._taskmarksDataFilePath);

		if (PathHelper._taskmarksDataFilePath === undefined || !fileFound) {
			this._taskmarksJsonIsNew = true;
			return '{"activeTaskName": "default", "persistTasks": [{"name": "default", "persistFiles": []}]}';
		}
		let taskmarksJson = readFileSync(PathHelper._taskmarksDataFilePath).toString();

		// // 'upgrade' taskmarks.json
		// taskmarksJson = PathHelper.replaceAll(
		//   taskmarksJson,
		//   '"marks"',
		//   '"lineNumbers"'
		// );
		// taskmarksJson = PathHelper.replaceAll(
		//   taskmarksJson,
		//   '"tasks"',
		//   '"persistTasks"'
		// );
		// taskmarksJson = PathHelper.replaceAll(
		//   taskmarksJson,
		//   '"files"',
		//   '"persistFiles"'
		// );
		return taskmarksJson;
	}

	static replaceAll(theString: string, old: string, newString: string) {
		while (theString.indexOf(old) > -1) {
			theString = theString.replace(old, newString);
		}
		return theString;
	}
}
