import { File } from './File';
import { andAnotherTask } from './JestHelpers';
import { Task } from './Task';
import { TaskManager } from './TaskManager';
import { Mark } from './Mark';

beforeAll(() => {
  jest
    .spyOn(Mark.prototype, 'getQuickPickItem')
    .mockImplementation((filepath: string, lineNumber: number, label: string) =>
      Promise.resolve()
    );
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('TaskManager Tests', () => {
  const taskManager = TaskManager.instance;
  const defaultTask = new Task('default');
  const anotherTask = new Task('another task');
  const yetAnotherTask = new Task('yet another task');
  const defaultTaskList: Task[] = [defaultTask];

  beforeEach(() => {});

  it('the active Task should be default', () => {
    taskManager.useActiveTask();
    expect(taskManager.activeTask).toEqual(defaultTask);
  });

  it('the Tasklist should be empty', () => {
    taskManager.useActiveTask();
    expect(taskManager.allTasks).toStrictEqual(defaultTaskList);
  });

  it('the active Task should switch to -another task-', () => {
    taskManager.useActiveTask('another task');
    expect(taskManager.activeTask).toEqual(anotherTask);
  });

  it('adding a Task should not switch activeTask', () => {
    taskManager.useActiveTask('another task');
    expect(taskManager.activeTask).toEqual(anotherTask);

    taskManager.addTask(andAnotherTask);

    const task = new Task(andAnotherTask.name);
    andAnotherTask.persistFiles.forEach((persistFile) => {
      const file = new File(persistFile.filepath);
      persistFile.lineNumbers.forEach((lineNumber) => {
        file.addMark(lineNumber);
      });
      task.files.push(file);
    });

    expect(taskManager.activeTask).toEqual(anotherTask);
  });

  it('should remove -and another task-', () => {
    taskManager.addTask(andAnotherTask);
    taskManager.useActiveTask('and another task');
    const activeTask = taskManager.activeTask;
    taskManager.delete('and another task');
    taskManager.useActiveTask('another task');
    expect(taskManager.allTasks).not.toContain(activeTask);
    expect(taskManager.activeTask).toEqual(anotherTask);
  });

  it('should remove -yet another task- and switch to -default-', () => {
    taskManager.useActiveTask('yet another task');
    expect(taskManager.activeTask).toEqual(yetAnotherTask);

    taskManager.delete('yet another task');
    expect(taskManager.allTasks).not.toContain(yetAnotherTask);
    expect(taskManager.activeTask).toEqual(defaultTask);
  });

  // it('', () => {
  //   taskManager.useActiveTask('another task');

  //   expect(taskManager.activeTask).toEqual(anotherTask);
  // });

  // ToDo NK - add tests for nextMark, previousMark, nextDocument and previousDocument
});
