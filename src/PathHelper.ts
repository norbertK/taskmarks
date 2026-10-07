import * as vscode from 'vscode';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import { detectPathCharacters, getFullPath as coreGetFullPath, isInsideBasePath, reducePath as coreReducePath } from './core/paths';
import { createDefaultTaskmarksJson } from './core/serialization';

export abstract class PathHelper {
	private static _basePath = '';

	private static _taskmarksDataFilePath: string;
	// the one file for all workspaces that taskmarks.useGlobalTaskmarksJson used up to 1.0.1 - only set while it may still be needed
	private static _formerGlobalFilePath: string | undefined;
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
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders === undefined || workspaceFolders.length === 0) {
			throw new Error('Error loading vscode.workspace! Stop!');
		}
		const localFilePath = join(workspaceFolders[0].uri.fsPath, '.vscode', 'taskmarks.json');

		const pathChars = detectPathCharacters(localFilePath);
		PathHelper._activePathChar = pathChars.active;
		PathHelper._inactivePathChar = pathChars.inactive;

		this._taskmarksDataFilePath = localFilePath;
		this._formerGlobalFilePath = undefined;

		// a file in the project is always used, the setting only decides where a new one goes
		const useGlobalTaskmarksJson = vscode.workspace.getConfiguration().get<boolean>('taskmarks.useGlobalTaskmarksJson');
		if (existsSync(localFilePath) || !useGlobalTaskmarksJson || !context.storageUri) {
			return;
		}

		// VS Code's storage for this workspace: paths in taskmarks.json are relative to the workspace,
		// so one file for all workspaces (globalStorageUri, used up to 1.0.1) mixed the marks of all projects
		this._taskmarksDataFilePath = join(context.storageUri.fsPath, 'taskmarks.json');
		this._formerGlobalFilePath = join(context.globalStorageUri.fsPath, 'taskmarks.json');
	}

	static checkTaskmarksDataFilePath(): void {
		// recursive: VS Code doesn't create the storage folder of a workspace
		mkdirSync(dirname(PathHelper.taskmarksDataFilePath), { recursive: true });
	}

	// filepath is relative to the workspace folder, as stored in a File
	static fileExists(filepath: string): boolean {
		return existsSync(PathHelper.getFullPath(filepath));
	}

	static saveTaskmarks(taskmarksJsonToBeSaved: string) {
		writeFileSync(PathHelper.taskmarksDataFilePath, taskmarksJsonToBeSaved);
		this._taskmarksJsonIsNew = false;
	}

	static getFullPath(filepath: string): string {
		return coreGetFullPath(PathHelper.basePath, filepath);
	}

	static isInWorkspace(filepath: string): boolean {
		return isInsideBasePath(PathHelper.basePath, filepath);
	}

	static reducePath(filepath: string): string {
		return coreReducePath(PathHelper.basePath, filepath);
	}

	static getTaskmarksJson(context: vscode.ExtensionContext): string {
		PathHelper.initTaskmarksDataFilePath(context);

		if (existsSync(PathHelper._taskmarksDataFilePath)) {
			this._taskmarksJsonIsNew = false;
			return readFileSync(PathHelper._taskmarksDataFilePath).toString();
		}

		this._taskmarksJsonIsNew = true;
		// start with the former file for all workspaces - it is not changed, the first save writes the file of this workspace
		if (this._formerGlobalFilePath && existsSync(this._formerGlobalFilePath)) {
			return readFileSync(this._formerGlobalFilePath).toString();
		}
		return createDefaultTaskmarksJson();
	}

	// the current content of taskmarks.json, undefined if there is no file
	static readTaskmarksJson(): string | undefined {
		if (!PathHelper._taskmarksDataFilePath || !existsSync(PathHelper._taskmarksDataFilePath)) {
			return undefined;
		}
		this._taskmarksJsonIsNew = false;
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
}
