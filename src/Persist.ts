import * as vscode from 'vscode';

import { TaskManager } from './TaskManager';
import { Task } from './Task';

import type { IPersistFile, IPersistTask, IPersistTaskManager } from './types';
import { PathHelper } from './PathHelper';

export abstract class Persist {
  private static _taskManager: TaskManager;

  static initAndLoad(taskManager: TaskManager): void {
    this._taskManager = taskManager;
    const taskmarksJson = PathHelper.getTaskmarksJson();
    const { persistTasks, activeTaskName }: IPersistTaskManager =
      JSON.parse(taskmarksJson);

    persistTasks.forEach((persistTask) => {
      const iPersistFiles: IPersistFile[] = [];

      persistTask.persistFiles.forEach((persistFile) => {
        persistFile.filepath = persistFile.filepath.replace(
          PathHelper.inactivePathChar,
          PathHelper.activePathChar
        );

        const fullPath = PathHelper.getFullPath(persistFile.filepath);
        if (fullPath !== undefined) {
          iPersistFiles.push(persistFile);
        }
      });

      if (iPersistFiles && iPersistFiles.length > 0) {
        persistTask.persistFiles = iPersistFiles;
        taskManager.addTask(persistTask);
      }
    });
    if (taskManager.activeTask.name !== activeTaskName) {
      taskManager.useActiveTask(activeTaskName);
    }
  }

  static saveTasks(): void {
    PathHelper.checkTaskmarksDataFilePath();

    if (!this._taskManager.activeTask) {
      throw new Error('no active task');
    }
    const persistTaskManager: IPersistTaskManager = {
      activeTaskName: this._taskManager.activeTask.name,
      persistTasks: [],
    };

    this._taskManager.allTasks.forEach((task) => {
      const persistTask: IPersistTask = this.copyTaskToPersistTask(task);
      persistTaskManager.persistTasks.push(persistTask);
    });

    PathHelper.saveTaskmarks(persistTaskManager);
  }

  static copyToClipboard(): void {
    if (!this._taskManager.activeTask) {
      throw new Error('no active task');
    }
    const persistTaskVersionOfActiveTask = this.copyTaskToPersistTask(
      this._taskManager.activeTask
    );

    const activeTaskString = JSON.stringify(persistTaskVersionOfActiveTask);

    vscode.env.clipboard.writeText(activeTaskString);
  }

  static pasteFromClipboard(): void {
    vscode.env.clipboard.readText().then((clip) => {
      let activeTaskString = clip;

      if (!activeTaskString) {
        vscode.window.showInformationMessage(
          'Could not paste Task from Clipboard.'
        );
        return;
      }

      try {
        const persistedTask = <IPersistTask>JSON.parse(activeTaskString);

        this._taskManager.addTask(persistedTask);

        this.saveTasks();
      } catch (error) {
        vscode.window.showInformationMessage(
          'PasteFromClipboard failed with ' + error
        );
      }
    });
  }

  private static copyTaskToPersistTask(task: Task): IPersistTask {
    const persistTask: IPersistTask = {
      name: task.name,
      persistFiles: [],
    };

    task.files.forEach((file) => {
      if (file && file.lineNumbers && file.lineNumbers.length > 0) {
        const fullPath = PathHelper.getFullPath(file.filepath);
        if (fullPath && PathHelper.fileExists(fullPath)) {
          const lineNumbers: number[] = file.lineNumbers;

          const persistFile: IPersistFile = {
            filepath: file.filepath,
            lineNumbers: lineNumbers.sort((a, b) => a - b),
          };
          persistTask.persistFiles.push(persistFile);
        }
      }
    });
    return persistTask;
  }
}
