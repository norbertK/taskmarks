import { Task } from './Task';
import { TaskManager } from './TaskManager';

describe('TaskManager Tests', () => {
  const taskManager = TaskManager.instance;
  const defaultTask = new Task('default');
  const activeTask = new Task('activeTask');

  const defaultTaskList: Task[] = [defaultTask];

  it('the active Task should be default and tasks empty', () => {
    expect(taskManager.activeTask).toEqual(defaultTask);
  });

  it('the Tasklist should be empty', () => {
    expect(taskManager.allTasks).toStrictEqual(defaultTaskList);
  });

  it('the active Task should remain as before', () => {
    taskManager.setActiveTask('activeTask');
    expect(taskManager.activeTask).toEqual(defaultTask);
  });

  it('the active Task should be activeTask', () => {
    taskManager.useActiveTask('activeTask');

    expect(taskManager.activeTask).toEqual(activeTask);
  });
});
