import { TaskManager } from './TaskManager';
import { Persist } from './Persist';
import { IPersistFile, IPersistTask, IPersistTaskManager } from './types';
import { PathHelper } from './PathHelper';
import { taskmarksJson } from './JestHelpers';
import { Task } from './Task';

const basePath = 'c:\\temp';
const markPath = '\\src\\Mark.ts';
const fullMarkPath = 'c:\\temp\\src\\Mark.ts';

jest.mock('./PathHelper');

const taskManager = TaskManager.instance;

const { tasks, activeTaskName }: IPersistTaskManager =
  JSON.parse(taskmarksJson);

describe('Persist Tests', () => {
  let mockFileExists = jest.fn();
  let mockSaveTaskmarks = jest.fn();
  let mockStaticMethod = jest.fn();
  let mockCheckTaskmarksDataFilePath = jest.fn();

  beforeEach(() => {
    PathHelper.fileExists = mockFileExists;
    PathHelper.saveTaskmarks = mockSaveTaskmarks;
    PathHelper.checkTaskmarksDataFilePath = mockCheckTaskmarksDataFilePath;
    PathHelper.getTaskmarksJson = mockStaticMethod;
  });

  test('initAndLoad', () => {
    mockStaticMethod.mockReturnValue(taskmarksJson);

    Persist.initAndLoad(taskManager);

    expect(taskManager.activeTask.name).toEqual(activeTaskName);
    expect(mockStaticMethod).toHaveBeenCalled();
  });

  it('saveTasks', () => {
    mockFileExists.mockReturnValue(true);
    Persist.saveTasks();

    const persistTaskManager: IPersistTaskManager = {
      activeTaskName: taskManager.activeTask.name,
      tasks: [],
    };

    taskManager.allTasks.forEach((task) => {
      const persistTask: IPersistTask = copyTaskToPersistTask(task);
      persistTaskManager.tasks.push(persistTask);
    });

    expect(mockSaveTaskmarks).toBeCalledWith(persistTaskManager);
  });

  // it('a longer path', () => {
  //   expect(PathHelper.getFullPath(markPath)).toBe(fullMarkPath);
  // });

  // it('reducePath', () => {
  //   expect(PathHelper.reducePath(fullMarkPath)).toBe(markPath);
  // });

  // todo still no idea how to mock vscode returns - same problem testing persist
  // it('blaaaah', () => {
  //   expect(PathHelper.getTaskmarksJson()).toBe(taskmarksjson);
  // });
});

function copyTaskToPersistTask(task: Task): IPersistTask {
  const persistTask: IPersistTask = {
    name: task.name,
    files: [],
  };

  task.files.forEach((file) => {
    if (file && file.lineNumbers && file.lineNumbers.length > 0) {
      const lineNumbers: number[] = file.lineNumbers;

      const persistFile: IPersistFile = {
        filepath: file.filepath,
        lineNumbers: lineNumbers.sort(),
      };
      persistTask.files.push(persistFile);
    }
  });
  return persistTask;
}
