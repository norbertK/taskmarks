import * as vscode from 'vscode';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { IPersistTaskManager } from './types';

export abstract class PathHelper {
  private static _basePath = '';

  private static _taskmarksDataFilePath: string;
  private static _activePathChar: string;
  private static _inactivePathChar: string;

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

  static initTaskmarksDataFilePath(): void {
    if (!this._taskmarksDataFilePath) {
      if (
        vscode.workspace.workspaceFolders === undefined ||
        vscode.workspace.workspaceFolders.length === 0
      ) {
        throw new Error('Error loading vscode.workspace! Stop!');
      }
      this._taskmarksDataFilePath = join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        '.vscode',
        'taskmarks.json'
      );

      if (this._taskmarksDataFilePath.indexOf('/') > -1) {
        // PathHelper._pathType = PathType.unixLike;
        PathHelper._activePathChar = '/';
        PathHelper._inactivePathChar = '\\';
      } else {
        // PathHelper._pathType = PathType.windowsLike;
        PathHelper._activePathChar = '\\';
        PathHelper._inactivePathChar = '/';
      }
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

  static saveTaskmarks(persistTaskManager: IPersistTaskManager) {
    const taskmarksDataFilePath = PathHelper.taskmarksDataFilePath;
    writeFileSync(
      taskmarksDataFilePath,
      JSON.stringify(persistTaskManager, null, '  ')
    );
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

  static getTaskmarksJson(): string {
    PathHelper.initTaskmarksDataFilePath();
    const fileFound = existsSync(PathHelper._taskmarksDataFilePath);
    if (PathHelper._taskmarksDataFilePath === undefined || !fileFound) {
      return '{"activeTaskName": "default", "persistTasks": [{"name": "default", "persistFiles": []}]}';
    }
    let taskmarksJson = readFileSync(
      PathHelper._taskmarksDataFilePath
    ).toString();

    // 'upgrade' taskmarks.json
    taskmarksJson = PathHelper.replaceOldNames(
      taskmarksJson,
      '"marks"',
      '"lineNumbers"'
    );
    taskmarksJson = PathHelper.replaceOldNames(
      taskmarksJson,
      '"tasks"',
      '"persistTasks"'
    );
    taskmarksJson = PathHelper.replaceOldNames(
      taskmarksJson,
      '"files"',
      '"persistFiles"'
    );
    return taskmarksJson;
  }

  private static replaceOldNames(
    taskmarksJson: string,
    oldName: string,
    newName: string
  ) {
    while (taskmarksJson.indexOf(oldName) > -1) {
      taskmarksJson = taskmarksJson.replace(oldName, newName);
    }
    return taskmarksJson;
  }
}
