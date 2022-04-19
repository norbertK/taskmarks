import { File } from './File';
import { andAnotherTask } from './JestHelpers';
import { Task } from './Task';
import { TaskManager } from './TaskManager';

describe('TaskManager Tests', () => {
  const taskManager = TaskManager.instance;
  const defaultTask = new Task('default');
  const anotherTask = new Task('another task');

  const defaultTaskList: Task[] = [defaultTask];

  it('the active Task should be default', () => {
    expect(taskManager.activeTask).toEqual(defaultTask);
  });

  it('the Tasklist should be empty', () => {
    expect(taskManager.allTasks).toStrictEqual(defaultTaskList);
  });

  it('the active Task should switch to -another task-', () => {
    taskManager.useActiveTask('another task');

    expect(taskManager.activeTask).toEqual(anotherTask);
  });

  it('the active Task should switch to -and another task-', () => {
    taskManager.addTask(andAnotherTask);

    const task = new Task(andAnotherTask.name);
    andAnotherTask.persistFiles.forEach((persistFile) => {
      const file = new File(persistFile.filepath);
      persistFile.lineNumbers.forEach((lineNumber) => {
        file.addMark(lineNumber);
      });

      task.files.push(file);
    });

    expect(taskManager.activeTask).toEqual(task);
  });

  // it('', () => {
  //   taskManager.useActiveTask('another Task');

  //   expect(taskManager.activeTask).toEqual(anotherTask);
  // });

  // it('', () => {
  //   taskManager.useActiveTask('another Task');

  //   expect(taskManager.activeTask).toEqual(anotherTask);
  // });

  // it('', () => {
  //   taskManager.useActiveTask('another Task');

  //   expect(taskManager.activeTask).toEqual(anotherTask);
  // });
});
