import * as vscode from 'vscode';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';

import { TaskManager } from '../../TaskManager';
import { Persist } from '../../Persist';
import { PathHelper } from '../../PathHelper';
import type { IPersistTask } from '../../types';

describe('Persist', () => {
	const context = {} as vscode.ExtensionContext;
	const fileA = '/src/a.ts';
	const fullPathA = '/workspace/src/a.ts';

	let taskManager: TaskManager;
	let previousBasePath: string;

	// the faked taskmarks.json: its content, whether it exists, what was written to it
	let fileContent: string;
	let isNew: boolean;
	let saveTaskmarks: sinon.SinonStub;
	let writeBackup: sinon.SinonStub;
	let fileExists: sinon.SinonStub;

	let showWarningMessage: sinon.SinonSpy;
	let showInformationMessage: sinon.SinonSpy;
	let clipboardText: string;

	function taskmarksJson(activeTaskName: string, persistTasks: IPersistTask[], version: number | 'none' = 2): string {
		return JSON.stringify({ ...(version === 'none' ? {} : { version }), activeTaskName, persistTasks }, null, '  ');
	}

	function taskWithMark(name: string, filepath: string, lineNumber: number, label = ''): IPersistTask {
		return { name, persistFiles: [{ filepath, persistMarks: [{ lineNumber, label }] }] };
	}

	function load(json: string): void {
		fileContent = json;
		isNew = false;
		Persist.initAndLoad(taskManager, context);
	}

	function loadWithoutFile(): void {
		fileContent = taskmarksJson('default', [{ name: 'default', persistFiles: [] }]);
		isNew = true;
		Persist.initAndLoad(taskManager, context);
	}

	function lastSaved(): { version: number; activeTaskName: string; persistTasks: IPersistTask[] } {
		return JSON.parse(saveTaskmarks.lastCall.args[0]);
	}

	function clipboardRead(): Promise<void> {
		return new Promise((resolve) => setImmediate(resolve));
	}

	beforeEach(() => {
		taskManager = TaskManager.instance;
		[...taskManager.taskNames].forEach((name) => taskManager.delete(name));
		previousBasePath = PathHelper.basePath;
		PathHelper.basePath = '/workspace';
		(Persist as any)._readOnly = false;

		sinon.stub(PathHelper, 'getTaskmarksJson').callsFake(() => fileContent);
		sinon.stub(PathHelper, 'taskmarksJsonIsNew').get(() => isNew);
		sinon.stub(PathHelper, 'activePathChar').get(() => '/');
		sinon.stub(PathHelper, 'inactivePathChar').get(() => '\\');
		sinon.stub(PathHelper, 'checkTaskmarksDataFilePath');
		saveTaskmarks = sinon.stub(PathHelper, 'saveTaskmarks').callsFake(() => {
			isNew = false;
		});
		writeBackup = sinon.stub(PathHelper, 'writeBackup').returns('taskmarks.json.bak');
		fileExists = sinon.stub(PathHelper, 'fileExists').returns(true);

		showWarningMessage = sinon.fake();
		sinon.replace(vscode.window, 'showWarningMessage', showWarningMessage as any);
		showInformationMessage = sinon.fake();
		sinon.replace(vscode.window, 'showInformationMessage', showInformationMessage as any);

		clipboardText = '';
		sinon.stub(Persist, 'readClipboard').callsFake(() => Promise.resolve(clipboardText));
		sinon.stub(Persist, 'writeClipboard').callsFake((text: string) => {
			clipboardText = text;
			return Promise.resolve();
		});
	});

	afterEach(() => {
		sinon.restore();
		(Persist as any)._readOnly = false;
		[...taskManager.taskNames].forEach((name) => taskManager.delete(name));
		PathHelper.basePath = previousBasePath;
	});

	describe('initAndLoad', () => {
		it('should load the tasks with their marks and labels and make the stored task the active one', () => {
			load(taskmarksJson('second', [taskWithMark('first', fileA, 3, 'look here'), taskWithMark('second', '/src/b.ts', 7)]));

			expect(taskManager.taskNames).to.include.members(['first', 'second']);
			expect(taskManager.activeTask.name).to.equal('second');
			const first = taskManager.allTasks.find((task) => task.name === 'first');
			expect(first?.getFile(fileA)?.allPersistMarks).to.deep.equal([{ lineNumber: 3, label: 'look here' }]);
			expect(showWarningMessage.called).to.be.false;
		});

		it('should convert the paths to the separator of this system', () => {
			load(taskmarksJson('default', [taskWithMark('default', '\\src\\a.ts', 3)]));
			expect(taskManager.activeTask.getFile(fileA)?.hasMark(3)).to.be.true;
		});

		it('should not write a backup for a file in the current format', () => {
			load(taskmarksJson('default', [taskWithMark('default', fileA, 3)]));
			expect(writeBackup.called).to.be.false;
		});

		it('should back up a file in an older format before it is upgraded', () => {
			const oldJson = taskmarksJson('default', [taskWithMark('default', fileA, 3)], 'none');
			load(oldJson);

			expect(writeBackup.calledOnceWithExactly('v1', oldJson)).to.be.true;
			expect(taskManager.activeTask.getFile(fileA)?.hasMark(3)).to.be.true;
		});

		it('should load the oldest format (tasks / files / marks)', () => {
			const oldJson = JSON.stringify({ activeTaskName: 'default', tasks: [{ name: 'default', files: [{ filepath: fileA, marks: [3, 9] }] }] });
			load(oldJson);

			expect(writeBackup.calledOnceWithExactly('v0', oldJson)).to.be.true;
			expect(taskManager.activeTask.getFile(fileA)?.lineNumbers).to.deep.equal([3, 9]);
		});

		it('should not write a backup when there is no file yet', () => {
			loadWithoutFile();
			expect(writeBackup.called).to.be.false;
			expect(taskManager.activeTask.name).to.equal('default');
		});

		it('should back up an invalid file, warn and start with an empty default task', () => {
			load('{ this is not json');

			expect(writeBackup.calledOnceWithExactly('invalid', '{ this is not json')).to.be.true;
			expect(showWarningMessage.calledOnce).to.be.true;
			expect(taskManager.activeTask.name).to.equal('default');
			expect(taskManager.activeTask.hasMarks).to.be.false;
		});

		it('should load a file of a newer format, warn and never save over it', () => {
			load(taskmarksJson('default', [taskWithMark('default', fileA, 3)], 99));

			expect(showWarningMessage.calledOnce).to.be.true;
			expect(writeBackup.called).to.be.false;
			expect(taskManager.activeTask.getFile(fileA)?.hasMark(3)).to.be.true;

			taskManager.activeTask.toggle(fullPathA, 5, '');
			Persist.saveTaskmarksJson();
			expect(saveTaskmarks.called).to.be.false;
		});

		it('should save again after a newer file was replaced by a readable one', () => {
			load(taskmarksJson('default', [], 99));
			load(taskmarksJson('default', [taskWithMark('default', fileA, 3)]));

			taskManager.activeTask.toggle(fullPathA, 5, '');
			Persist.saveTaskmarksJson();
			expect(saveTaskmarks.calledOnce).to.be.true;
		});
	});

	describe('saveTaskmarksJson', () => {
		it('should write all tasks in the current format', () => {
			load(taskmarksJson('default', [taskWithMark('default', fileA, 3, 'look here')]));
			taskManager.useActiveTask('other').toggle('/workspace/src/b.ts', 7, '');

			Persist.saveTaskmarksJson();

			expect(lastSaved()).to.deep.equal({
				version: 2,
				activeTaskName: 'other',
				persistTasks: [taskWithMark('default', fileA, 3, 'look here'), taskWithMark('other', '/src/b.ts', 7)],
			});
		});

		it('should write the marks of a file sorted by line', () => {
			loadWithoutFile();
			taskManager.activeTask.toggle(fullPathA, 9, '');
			taskManager.activeTask.toggle(fullPathA, 3, '');

			Persist.saveTaskmarksJson();

			expect(lastSaved().persistTasks[0].persistFiles[0].persistMarks.map((mark) => mark.lineNumber)).to.deep.equal([3, 9]);
		});

		it('should not write when nothing has changed since the file was loaded', () => {
			load(taskmarksJson('default', [taskWithMark('default', fileA, 3)]));
			Persist.saveTaskmarksJson();
			expect(saveTaskmarks.called).to.be.false;
		});

		it('should not write again when nothing has changed since the last save', () => {
			load(taskmarksJson('default', [taskWithMark('default', fileA, 3)]));
			taskManager.activeTask.toggle(fullPathA, 5, '');

			Persist.saveTaskmarksJson();
			Persist.saveTaskmarksJson();

			expect(saveTaskmarks.calledOnce).to.be.true;
		});

		it('should upgrade a file in an older format with the first save', () => {
			load(taskmarksJson('default', [taskWithMark('default', fileA, 3)], 'none'));
			Persist.saveTaskmarksJson();
			expect(lastSaved().version).to.equal(2);
		});

		it('should not create a file while the default task is active and has no marks', () => {
			loadWithoutFile();
			Persist.saveTaskmarksJson();
			expect(saveTaskmarks.called).to.be.false;
		});

		it('should create the file with the first mark', () => {
			loadWithoutFile();
			taskManager.activeTask.toggle(fullPathA, 3, '');
			Persist.saveTaskmarksJson();
			expect(lastSaved().persistTasks).to.deep.equal([taskWithMark('default', fileA, 3)]);
		});

		it('should create the file when another task than default is active', () => {
			loadWithoutFile();
			taskManager.useActiveTask('other');
			Persist.saveTaskmarksJson();
			expect(lastSaved().activeTaskName).to.equal('other');
		});

		it('should keep the marks of a file that does not exist here', () => {
			load(taskmarksJson('default', [taskWithMark('default', '/src/only-on-another-branch.ts', 3, 'from a teammate')]));
			fileExists.returns(false);
			taskManager.activeTask.toggle(fullPathA, 5, '');

			Persist.saveTaskmarksJson();

			expect(lastSaved().persistTasks[0].persistFiles).to.deep.equal([
				{ filepath: '/src/only-on-another-branch.ts', persistMarks: [{ lineNumber: 3, label: 'from a teammate' }] },
				{ filepath: fileA, persistMarks: [{ lineNumber: 5, label: '' }] },
			]);
		});

		it('should try again with the next save after the file could not be written', () => {
			load(taskmarksJson('default', [taskWithMark('default', fileA, 3)]));
			taskManager.activeTask.toggle(fullPathA, 5, '');
			saveTaskmarks.onFirstCall().throws(new Error('file is locked'));

			expect(() => Persist.saveTaskmarksJson()).to.throw('file is locked');
			Persist.saveTaskmarksJson();

			expect(saveTaskmarks.calledTwice).to.be.true;
		});
	});

	describe('copyToClipboard', () => {
		it('should put the active task on the clipboard', () => {
			load(taskmarksJson('default', [taskWithMark('default', fileA, 3, 'look here')]));
			Persist.copyToClipboard();
			expect(JSON.parse(clipboardText)).to.deep.equal(taskWithMark('default', fileA, 3, 'look here'));
		});

		it('should also copy the marks of a file that does not exist here', () => {
			load(taskmarksJson('default', [taskWithMark('default', fileA, 3)]));
			fileExists.returns(false);
			Persist.copyToClipboard();
			expect(JSON.parse(clipboardText)).to.deep.equal(taskWithMark('default', fileA, 3));
		});
	});

	describe('pasteFromClipboard', () => {
		beforeEach(() => {
			load(taskmarksJson('default', [taskWithMark('default', fileA, 3)]));
		});

		it('should add the task from the clipboard and say so', async () => {
			clipboardText = JSON.stringify(taskWithMark('pasted', '/src/b.ts', 7, 'look here'));

			const pasted = await Persist.pasteFromClipboard();
			await clipboardRead();

			expect(pasted).to.be.true;
			const task = taskManager.allTasks.find((task) => task.name === 'pasted');
			expect(task?.getFile('/src/b.ts')?.allPersistMarks).to.deep.equal([{ lineNumber: 7, label: 'look here' }]);
			expect(taskManager.activeTask.name).to.equal('default');
			expect(showInformationMessage.calledOnceWithExactly("Taskmarks: task 'pasted' pasted from the clipboard.")).to.be.true;
		});

		it('should merge the marks into a task with the same name', async () => {
			clipboardText = JSON.stringify(taskWithMark('default', fileA, 9));

			await Persist.pasteFromClipboard();
			await clipboardRead();

			expect(taskManager.activeTask.getFile(fileA)?.lineNumbers).to.deep.equal([3, 9]);
		});

		it('should accept a task copied by an older version', async () => {
			clipboardText = JSON.stringify({ name: 'old', files: [{ filepath: fileA, lineNumbers: [4] }] });

			await Persist.pasteFromClipboard();
			await clipboardRead();

			expect(taskManager.allTasks.find((task) => task.name === 'old')?.getFile(fileA)?.hasMark(4)).to.be.true;
		});

		it('should convert the paths to the separator of this system', async () => {
			clipboardText = JSON.stringify(taskWithMark('pasted', '\\src\\b.ts', 7));

			await Persist.pasteFromClipboard();
			await clipboardRead();

			expect(taskManager.allTasks.find((task) => task.name === 'pasted')?.getFile('/src/b.ts')?.hasMark(7)).to.be.true;
		});

		it('should say that the clipboard is empty', async () => {
			clipboardText = '';

			const pasted = await Persist.pasteFromClipboard();
			await clipboardRead();

			expect(pasted).to.be.false;
			expect(showInformationMessage.calledOnceWithExactly('Taskmarks: the clipboard does not contain a Taskmarks task.')).to.be.true;
		});

		it('should say that text which is not JSON is not a task', async () => {
			clipboardText = 'just some text';

			const pasted = await Persist.pasteFromClipboard();
			await clipboardRead();

			expect(pasted).to.be.false;
			expect(showInformationMessage.calledOnceWithExactly('Taskmarks: the clipboard does not contain a Taskmarks task.')).to.be.true;
		});

		it('should say that JSON which is not a task is not a task', async () => {
			clipboardText = JSON.stringify({ some: 'thing' });

			const pasted = await Persist.pasteFromClipboard();
			await clipboardRead();

			expect(pasted).to.be.false;
			expect(showInformationMessage.calledOnceWithExactly('Taskmarks: the clipboard does not contain a Taskmarks task.')).to.be.true;
			expect(taskManager.taskNames).to.deep.equal(['default']);
		});
	});
});
