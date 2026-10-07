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
		expect(JSON.stringify(taskManager.activeTask)).to.equal(JSON.stringify(defaultTask));
	});

	it('the Tasklist should be empty', () => {
		taskManager.useActiveTask();
		expect(JSON.stringify(taskManager.allTasks)).to.equal(JSON.stringify(defaultTaskList));
	});

	it('the active Task should switch to -another task-', () => {
		taskManager.useActiveTask('another task');
		expect(JSON.stringify(taskManager.activeTask)).to.equal(JSON.stringify(anotherTask));
	});

	it('adding a Task should not switch activeTask', () => {
		taskManager.useActiveTask('another task');
		expect(JSON.stringify(taskManager.activeTask)).to.equal(JSON.stringify(anotherTask));

		taskManager.addTask(andAnotherTask);

		const task = new Task(andAnotherTask.name);
		andAnotherTask.persistFiles.forEach((persistFile) => {
			const file = new File(persistFile.filepath);
			persistFile.persistMarks.forEach((mark) => {
				file.addMark(mark);
			});
			task.files.push(file);
		});

		expect(JSON.stringify(taskManager.activeTask)).to.equal(JSON.stringify(anotherTask));
	});

	it('should remove -and another task-', () => {
		taskManager.addTask(andAnotherTask);
		taskManager.useActiveTask('and another task');
		const activeTask = taskManager.activeTask;
		taskManager.delete('and another task');
		taskManager.useActiveTask('another task');
		expect(taskManager.allTasks).not.to.contain(activeTask);
		expect(JSON.stringify(taskManager.activeTask)).to.equal(JSON.stringify(anotherTask));
	});

	it('should remove -yet another task- and switch to -default-', () => {
		taskManager.useActiveTask('yet another task');
		expect(JSON.stringify(taskManager.activeTask)).to.equal(JSON.stringify(yetAnotherTask));

		taskManager.delete('yet another task');
		expect(taskManager.allTasks).not.to.contain(yetAnotherTask);
		expect(JSON.stringify(taskManager.activeTask)).to.equal(JSON.stringify(defaultTask));
	});

	// it('', () => {
	//   taskManager.useActiveTask('another task');

	//   expect(taskManager.activeTask).toEqual(anotherTask);
	// });

});

import { expect } from 'chai';
import * as sinon from 'sinon';
import { DecoratorHelper } from '../../DecoratorHelper';
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

	describe('#renameTask', () => {
		it('should rename an existing task', () => {
			taskManager.useActiveTask('task-to-rename');
			taskManager.renameTask('task-to-rename', 'renamed-task');
			expect(taskManager.taskNames).to.include('renamed-task');
		});

		it('should throw error for non-existent task', () => {
			expect(() => taskManager.renameTask('non-existent', 'new-name')).to.throw();
		});
	});

	describe('#taskNames', () => {
		it('should return array of task names', () => {
			taskManager.useActiveTask('task-a');
			taskManager.useActiveTask('task-b');
			const names = taskManager.taskNames;
			expect(names).to.include('task-a');
			expect(names).to.include('task-b');
		});
	});

	describe('#delete', () => {
		it('should remove the specified task', () => {
			taskManager.useActiveTask('delete-me');
			expect(taskManager.taskNames).to.include('delete-me');
			taskManager.delete('delete-me');
			expect(taskManager.taskNames).to.not.include('delete-me');
		});

		it('should switch to default when active task is deleted', () => {
			taskManager.useActiveTask('active-to-delete');
			taskManager.delete('active-to-delete');
			expect(taskManager.activeTask.name).to.equal('default');
		});

		it('should keep current active task when deleting a different task', () => {
			taskManager.useActiveTask('keep-active');
			taskManager.useActiveTask('delete-other');
			taskManager.useActiveTask('keep-active');
			taskManager.delete('delete-other');
			expect(taskManager.activeTask.name).to.equal('keep-active');
		});
	});

	describe('#nextDocument / #previousDocument', () => {
		let openAndShow: sinon.SinonStub;
		let task: Task;

		beforeEach(() => {
			openAndShow = sinon.stub(DecoratorHelper, 'openAndShow');
			taskManager.delete('navigation');
			task = taskManager.useActiveTask('navigation');
			task.toggle('/a.ts', 1, '');
			task.toggle('/a.ts', 9, '');
			task.use('/empty.ts');
			task.toggle('/b.ts', 2, '');
			task.toggle('/c.ts', 3, '');
		});

		afterEach(() => {
			openAndShow.restore();
			taskManager.delete('navigation');
		});

		it('should go to the file after the active file, not after the last added one', () => {
			task.use('/a.ts');
			taskManager.nextDocument();
			expect(openAndShow.calledOnceWithExactly('/b.ts', 2)).to.be.true;
		});

		it('should wrap from the last file to the first', () => {
			task.use('/c.ts');
			taskManager.nextDocument();
			expect(openAndShow.calledOnceWithExactly('/a.ts', 1)).to.be.true;
		});

		it('should go to the last mark of the file before the active file', () => {
			task.use('/b.ts');
			taskManager.previousDocument();
			expect(openAndShow.calledOnceWithExactly('/a.ts', 9)).to.be.true;
		});

		it('should wrap from the first file to the last', () => {
			task.use('/a.ts');
			taskManager.previousDocument();
			expect(openAndShow.calledOnceWithExactly('/c.ts', 3)).to.be.true;
		});

		it('should go to the next document when the active file has no further mark', () => {
			task.use('/a.ts');
			taskManager.nextMark(9);
			expect(openAndShow.calledOnceWithExactly('/b.ts', 2)).to.be.true;
		});

		it('should do nothing when no file has marks', () => {
			taskManager.delete('navigation');
			task = taskManager.useActiveTask('navigation');
			task.use('/empty.ts');
			taskManager.nextDocument();
			taskManager.previousDocument();
			expect(openAndShow.called).to.be.false;
		});

		it('should still find a file when the active file is no longer part of the task', () => {
			task.use('/b.ts');
			task.toggle('/b.ts', 2, '');
			taskManager.nextDocument();
			expect(openAndShow.calledOnceWithExactly('/a.ts', 1)).to.be.true;
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
