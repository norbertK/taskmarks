import * as vscode from 'vscode';

import { TaskManager } from './TaskManager';
import { Task } from './Task';

import type {
  IPersistFile,
  IPersistMark,
  IPersistTask,
  IPersistTaskManager,
  PathMark,
} from './types';
import { PathHelper } from './PathHelper';
import { Mark } from './Mark';
import { Helper } from './Helper';

export abstract class Persist {
  private static _taskManager: TaskManager;

  static initAndLoad(taskManager: TaskManager): void {
    this._taskManager = taskManager;
    const taskmarksJson = PathHelper.getTaskmarksJson();
    const persistTaskManager: IPersistTaskManager = JSON.parse(taskmarksJson);

    persistTaskManager.persistTasks.forEach((persistTask) => {
      // const iPersistFiles: IPersistFile[] = [];

      persistTask.persistFiles.forEach((persistFile) => {
        persistFile.filepath = PathHelper.replaceAll(
          persistFile.filepath,
          PathHelper.inactivePathChar,
          PathHelper.activePathChar
        );

        // if (PathHelper.fileExists(persistFile.filepath)) {
        //   const iPersistMarks: IPersistMark[] = [];
        //   persistFile.persistMarks.forEach((persistMark) => {});

        //   iPersistFiles.push(persistFile);
        // }

        // Helper.log(persistTask.name);
        taskManager.addTask(persistTask);
      });
    });
    if (taskManager.activeTask.name !== persistTaskManager.activeTaskName) {
      taskManager.useActiveTask(persistTaskManager.activeTaskName);
    }
  }

  static saveTaskmarksJson(): void {
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

        this.saveTaskmarksJson();
      } catch (error) {
        vscode.window.showInformationMessage(
          'PasteFromClipboard failed with ' + error
        );
      }
    });
  }

  static copyTaskToPersistTask(task: Task): IPersistTask {
    const persistTask: IPersistTask = {
      name: task.name,
      persistFiles: [],
    };

    task.files.forEach((file) => {
      if (
        file &&
        file.filepath &&
        file.lineNumbers &&
        file.lineNumbers.length > 0
      ) {
        if (PathHelper.fileExists(file.filepath)) {
          const marks: IPersistMark[] = file.allPersistMarks;

          const persistFile: IPersistFile = {
            filepath: file.filepath,
            persistMarks: marks.sort((a, b) => a.lineNumber - b.lineNumber),
          };
          persistTask.persistFiles.push(persistFile);
        }
      }
    });
    return persistTask;
  }
}
