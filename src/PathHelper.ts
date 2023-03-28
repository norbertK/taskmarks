import * as vscode from 'vscode';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
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

  static initTaskmarksDataFilePath(): void {
    if (!this._taskmarksDataFilePath) {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders === undefined || workspaceFolders.length === 0) {
        throw new Error('Error loading vscode.workspace! Stop!');
      }
      this._taskmarksDataFilePath = join(
        workspaceFolders[0].uri.fsPath,
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
    this._taskmarksJsonIsNew = false;
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
      this._taskmarksJsonIsNew = true;
      return '{"activeTaskName": "default", "persistTasks": [{"name": "default", "persistFiles": []}]}';
    }
    let taskmarksJson = readFileSync(
      PathHelper._taskmarksDataFilePath
    ).toString();

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
