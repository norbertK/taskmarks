import { File } from '../../File';
import { Task } from '../../Task';
import { TaskManager } from '../../TaskManager';
import { Mark } from '../../Mark';
import { describe, it, beforeEach, afterEach } from 'mocha';

// beforeAll(() => {
//   jest
//     .spyOn(Mark.prototype, 'setQuickPickItem')
//     .mockImplementation((filepath: string, lineNumber: number, label: string) =>
//       Promise.resolve()
//     );
// });

// afterAll(() => {
//   jest.restoreAllMocks();
// });

describe('TaskManager Tests', () => {
  const taskManager = TaskManager.instance;
  const defaultTask = new Task('default');
  const anotherTask = new Task('another task');
  const yetAnotherTask = new Task('yet another task');
  const defaultTaskList: Task[] = [defaultTask];
  const andAnotherTask: IPersistTask = {
    name: 'and another task',
    persistFiles: [
      {
        filepath: '\\\\DUMMY.MD',
        persistMarks: [
          { lineNumber: 115, label: '' },
          { lineNumber: 134, label: '' },
        ],
      },
      {
        filepath: '\\\\DUMMY',
        persistMarks: [{ lineNumber: 111, label: '' }],
      },
    ],
  };

  beforeEach(() => {});

  it('the active Task should be default', () => {
    taskManager.useActiveTask();
    expect(JSON.stringify(taskManager.activeTask)).to.equal(
      JSON.stringify(defaultTask)
    );
  });

  it('the Tasklist should be empty', () => {
    taskManager.useActiveTask();
    expect(JSON.stringify(taskManager.allTasks)).to.equal(
      JSON.stringify(defaultTaskList)
    );
  });

  it('the active Task should switch to -another task-', () => {
    taskManager.useActiveTask('another task');
    expect(JSON.stringify(taskManager.activeTask)).to.equal(
      JSON.stringify(anotherTask)
    );
  });

  it('adding a Task should not switch activeTask', () => {
    taskManager.useActiveTask('another task');
    expect(JSON.stringify(taskManager.activeTask)).to.equal(
      JSON.stringify(anotherTask)
    );

    taskManager.addTask(andAnotherTask);

    const task = new Task(andAnotherTask.name);
    andAnotherTask.persistFiles.forEach((persistFile) => {
      const file = new File(persistFile.filepath);
      persistFile.persistMarks.forEach((mark) => {
        file.addMark(mark);
      });
      task.files.push(file);
    });

    expect(JSON.stringify(taskManager.activeTask)).to.equal(
      JSON.stringify(anotherTask)
    );
  });

  it('should remove -and another task-', () => {
    taskManager.addTask(andAnotherTask);
    taskManager.useActiveTask('and another task');
    const activeTask = taskManager.activeTask;
    taskManager.delete('and another task');
    taskManager.useActiveTask('another task');
    expect(taskManager.allTasks).not.to.contain(activeTask);
    expect(JSON.stringify(taskManager.activeTask)).to.equal(
      JSON.stringify(anotherTask)
    );
  });

  it('should remove -yet another task- and switch to -default-', () => {
    taskManager.useActiveTask('yet another task');
    expect(JSON.stringify(taskManager.activeTask)).to.equal(
      JSON.stringify(yetAnotherTask)
    );

    taskManager.delete('yet another task');
    expect(taskManager.allTasks).not.to.contain(yetAnotherTask);
    expect(JSON.stringify(taskManager.activeTask)).to.equal(
      JSON.stringify(defaultTask)
    );
  });

  // it('', () => {
  //   taskManager.useActiveTask('another task');

  //   expect(taskManager.activeTask).toEqual(anotherTask);
  // });

  // ToDo NK - add tests for nextMark, previousMark, nextDocument and previousDocument
});

import { expect } from 'chai';
import { IPersistTask } from '../../types';

describe('TaskManager', () => {
  let taskManager: TaskManager;

  beforeEach(() => {
    taskManager = TaskManager.instance;
  });

  afterEach(() => {
    // taskManager = null;
  });

  describe('#useActiveTask', () => {
    it('should return the default task when no taskname is provided', () => {
      const defaultTask = taskManager.useActiveTask();
      expect(defaultTask.name).to.equal('default');
    });

    it('should return the task with the provided taskname when it exists', () => {
      taskManager.addTask({ name: 'test-task', persistFiles: [] });
      const testTask = taskManager.useActiveTask('test-task');
      expect(testTask.name).to.equal('test-task');
    });

    it('should create a new task with the provided taskname when it does not exist', () => {
      const newTask = taskManager.useActiveTask('new-task');
      expect(newTask.name).to.equal('new-task');
    });

    it('should return the existing active task when the same taskname is provided', () => {
      const activeTask = taskManager.useActiveTask();
      const sameTask = taskManager.useActiveTask();
      expect(sameTask).to.equal(activeTask);
    });
  });

  // describe('#addTask', () => {
  // 	it('should add a new task to the list of all tasks', () => {
  // 		const taskName = 'test-task';
  // 		taskManager.addTask({ name: taskName, files: [] });
  // 		expect(taskManager.taskNames).to.contain(taskName);
  // 	});

  // 	it('should merge files with an existing task when adding a task with the same name', () => {
  // 		const taskName = 'test-task';
  // 		taskManager.addTask({ name: taskName, files: [{ filepath: 'test.js', lineNumbers: [1] }] });
  // 		taskManager.addTask({ name: taskName, files: [{ filepath: 'test.js', lineNumbers: [2] }] });
  // 		const testTask = taskManager.allTasks.find((task) => task.name === taskName);
  // 		expect(testTask.files.length).to.equal(1);
  // 		expect(testTask.files[0].lineNumbers).to.deep.equal([1, 2]);
  // 	});
  // });
});
