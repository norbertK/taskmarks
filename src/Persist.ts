import * as vscode from 'vscode';

import type {
  IPersistFile,
  IPersistMark,
  IPersistTask,
  IPersistTaskManager,
} from './types';
import { PathHelper } from './PathHelper';
import { TaskManager } from './TaskManager';
import { Task } from './Task';

export abstract class Persist {
  private static _taskManager: TaskManager;

  static initAndLoad(taskManager: TaskManager): void {
    this._taskManager = taskManager;
    let taskmarksJson = PathHelper.getTaskmarksJson();
    let persistTaskManager = JSON.parse(taskmarksJson);

    if (
      persistTaskManager.persistTasks === undefined ||
      taskmarksJson.indexOf('"lineNumbers": [') > -1
    ) {
      // old version of taskmarks.json - discard
      const taskName = persistTaskManager.activeTaskName
        ? persistTaskManager.activeTaskName
        : 'default';
      taskManager.useActiveTask(taskName);
      Persist.saveTaskmarksJson();
      return;
    }

    (<IPersistTaskManager>persistTaskManager).persistTasks.forEach(
      (persistTask) => {
        persistTask.persistFiles.forEach((persistFile) => {
          persistFile.filepath = PathHelper.replaceAll(
            persistFile.filepath,
            PathHelper.inactivePathChar,
            PathHelper.activePathChar
          );
        });
        taskManager.addTask(persistTask);
      }
    );
    if (taskManager.activeTask.name !== persistTaskManager.activeTaskName) {
      taskManager.useActiveTask(persistTaskManager.activeTaskName);
    }
  }

  static saveTaskmarksJson(): void {
    if (!this._taskManager.activeTask) {
      console.log('no active task? - should never happen!');
      return;
    }
    if (PathHelper.taskmarksJsonIsNew) {
      if (
        this._taskManager.activeTask.name === 'default' &&
        !this._taskManager.activeTask.hasMarks
      ) {
        return;
      }
    }
    PathHelper.checkTaskmarksDataFilePath();

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
