import * as vscode from 'vscode';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

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

  private static initTaskmarksDataFilePath(): void {
    // console.log('PathHelper.taskmarksDataFilePath()');
    if (!this._taskmarksDataFilePath) {
      if (!vscode.workspace.workspaceFolders) {
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

  static getFullPath(filepath = ''): string {
    const pathWithBasePath = PathHelper.basePath + filepath;
    const pathWithBasePathExists = existsSync(pathWithBasePath);
    if (pathWithBasePathExists) {
      return pathWithBasePath;
    }

    throw new Error('invalid path');
  }

  static reducePath(filepath: string): string {
    if (filepath.startsWith(this.basePath)) {
      filepath = filepath.substring(this._basePath.length);
    }
    return filepath;
  }

  static getTaskmarksJson(): string {
    PathHelper.initTaskmarksDataFilePath;
    if (
      PathHelper._taskmarksDataFilePath === null ||
      PathHelper._taskmarksDataFilePath === undefined ||
      !existsSync(PathHelper._taskmarksDataFilePath)
    ) {
      throw new Error('Error loading taskmarks.json! Stop!');
    }
    let taskmarksJson = readFileSync(
      PathHelper._taskmarksDataFilePath
    ).toString();

    // 'upgrade' taskmarks.json
    if (taskmarksJson.indexOf('marks') > -1) {
      taskmarksJson = taskmarksJson.replace('marks', 'lineNumbers');

      while (taskmarksJson.indexOf('marks') > -1) {
        taskmarksJson = taskmarksJson.replace('marks', 'lineNumbers');
      }
    }
    return taskmarksJson;
  }
}
