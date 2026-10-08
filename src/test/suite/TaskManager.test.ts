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

		it('should refuse a name that another task already has', () => {
			taskManager.useActiveTask('rename-one').toggle('/one.ts', 1, '');
			taskManager.useActiveTask('rename-two').toggle('/two.ts', 1, '');

			expect(taskManager.renameTask('rename-two', 'rename-one')).to.be.false;

			expect(taskManager.taskNames.filter((name) => name === 'rename-one').length).to.equal(1);
			expect(taskManager.taskNames).to.include('rename-two');
			expect(taskManager.activeTask.name).to.equal('rename-two');
			taskManager.delete('rename-one');
			taskManager.delete('rename-two');
		});

		it('should report a successful rename', () => {
			taskManager.useActiveTask('rename-ok');
			expect(taskManager.renameTask('rename-ok', 'rename-done')).to.be.true;
			taskManager.delete('rename-done');
		});

		it('should accept the name the task already has', () => {
			taskManager.useActiveTask('rename-same');
			expect(taskManager.renameTask('rename-same', 'rename-same')).to.be.true;
			expect(taskManager.taskNames.filter((name) => name === 'rename-same').length).to.equal(1);
			taskManager.delete('rename-same');
		});
	});

	describe('#replaceTasks', () => {
		const replaced = ['replace-old', 'replace-a', 'replace-b', 'default'];

		afterEach(() => {
			replaced.forEach((name) => taskManager.delete(name));
		});

		it('should replace all tasks and activate the given one', () => {
			const oldTask = taskManager.useActiveTask('replace-old');
			oldTask.toggle('/old.ts', 1, '');

			taskManager.replaceTasks(
				[
					{ name: 'replace-a', persistFiles: [{ filepath: '/a.ts', persistMarks: [{ lineNumber: 2, label: 'a' }] }] },
					{ name: 'replace-b', persistFiles: [] },
				],
				'replace-b'
			);

			expect(taskManager.taskNames).to.deep.equal(['replace-a', 'replace-b']);
			expect(taskManager.activeTask.name).to.equal('replace-b');
			expect(taskManager.allTasks[0].getFile('/a.ts')?.allPersistMarks).to.deep.equal([{ lineNumber: 2, label: 'a' }]);
			expect(taskManager.allTasks).to.not.include(oldTask);
		});

		it('should create new task objects, also for a task with the same name', () => {
			const oldTask = taskManager.useActiveTask('replace-a');
			oldTask.toggle('/old.ts', 1, '');

			taskManager.replaceTasks([{ name: 'replace-a', persistFiles: [] }], 'replace-a');

			expect(taskManager.activeTask).to.not.equal(oldTask);
			expect(taskManager.activeTask.hasMarks).to.be.false;
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

		it('should replace the active default task with a new, empty default task', () => {
			const oldDefault = taskManager.useActiveTask('default');
			oldDefault.toggle('/delete-default.ts', 1, '');

			taskManager.delete('default');

			expect(taskManager.activeTask).to.not.equal(oldDefault);
			expect(taskManager.activeTask.name).to.equal('default');
			expect(taskManager.activeTask.hasMarks).to.be.false;
			expect(taskManager.allTasks).to.include(taskManager.activeTask);
			expect(taskManager.allTasks).to.not.include(oldDefault);
		});

		it('should keep current active task when deleting a different task', () => {
			taskManager.useActiveTask('keep-active');
			taskManager.useActiveTask('delete-other');
			taskManager.useActiveTask('keep-active');
			taskManager.delete('delete-other');
			expect(taskManager.activeTask.name).to.equal('keep-active');
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
