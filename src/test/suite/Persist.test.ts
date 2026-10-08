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
	let fileContent: string | undefined;
	let isNew: boolean;
	let saveTaskmarks: sinon.SinonStub;
	let writeBackup: sinon.SinonStub;

	let showWarningMessage: sinon.SinonSpy;
	let showInformationMessage: sinon.SinonSpy;
	let clipboardText: string;
	// the button the user clicks in a warning, undefined: the warning is dismissed
	let warningChoice: string | undefined;
	// the same for an information message
	let messageChoice: string | undefined;
	// the path separator of the system the tests pretend to run on
	let systemSeparator: '/' | '\\';

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

		sinon.stub(PathHelper, 'getTaskmarksJson').callsFake(() => fileContent ?? '');
		sinon.stub(PathHelper, 'readTaskmarksJson').callsFake(() => fileContent);
		sinon.stub(PathHelper, 'taskmarksJsonIsNew').get(() => isNew);
		systemSeparator = '/';
		sinon.stub(PathHelper, 'activePathChar').get(() => systemSeparator);
		sinon.stub(PathHelper, 'inactivePathChar').get(() => (systemSeparator === '/' ? '\\' : '/'));
		sinon.stub(PathHelper, 'checkTaskmarksDataFilePath');
		saveTaskmarks = sinon.stub(PathHelper, 'saveTaskmarks').callsFake((json: string) => {
			isNew = false;
			fileContent = json;
		});
		writeBackup = sinon.stub(PathHelper, 'writeBackup').returns('taskmarks.json.bak');

		warningChoice = undefined;
		showWarningMessage = sinon.fake(() => Promise.resolve(warningChoice));
		sinon.replace(vscode.window, 'showWarningMessage', showWarningMessage as any);
		messageChoice = undefined;
		showInformationMessage = sinon.fake(() => Promise.resolve(messageChoice));
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

		it('should keep the marks of a file that does not exist here (no check against the disk)', () => {
			load(taskmarksJson('default', [taskWithMark('default', '/src/only-on-another-branch.ts', 3, 'from a teammate')]));
			taskManager.activeTask.toggle(fullPathA, 5, '');

			Persist.saveTaskmarksJson();

			expect(lastSaved().persistTasks[0].persistFiles).to.deep.equal([
				{ filepath: '/src/only-on-another-branch.ts', persistMarks: [{ lineNumber: 3, label: 'from a teammate' }] },
				{ filepath: fileA, persistMarks: [{ lineNumber: 5, label: '' }] },
			]);
		});

		it('should keep the path separator of the file, also for new files', () => {
			load(taskmarksJson('default', [taskWithMark('default', '\\src\\a.ts', 3)]));
			taskManager.activeTask.toggle('/workspace/src/sub/b.ts', 5, '');

			Persist.saveTaskmarksJson();

			expect(lastSaved().persistTasks[0].persistFiles.map((file) => file.filepath)).to.deep.equal(['\\src\\a.ts', '\\src\\sub\\b.ts']);
		});

		it('should not write a file with the other path separator when nothing has changed', () => {
			load(taskmarksJson('default', [taskWithMark('default', '\\src\\a.ts', 3)]));
			Persist.saveTaskmarksJson();
			expect(saveTaskmarks.called).to.be.false;
		});

		it('should use the separator most paths of the file have', () => {
			load(
				taskmarksJson('default', [
					{
						name: 'default',
						persistFiles: [
							{ filepath: '\\src\\a.ts', persistMarks: [{ lineNumber: 1, label: '' }] },
							{ filepath: '\\src\\b.ts', persistMarks: [{ lineNumber: 1, label: '' }] },
							{ filepath: '/src/c.ts', persistMarks: [{ lineNumber: 1, label: '' }] },
						],
					},
				])
			);

			Persist.saveTaskmarksJson();

			expect(lastSaved().persistTasks[0].persistFiles.map((file) => file.filepath)).to.deep.equal(['\\src\\a.ts', '\\src\\b.ts', '\\src\\c.ts']);
		});

		it('should write a new file with / on every system', () => {
			systemSeparator = '\\';
			PathHelper.basePath = 'c:\\workspace';
			loadWithoutFile();
			taskManager.activeTask.toggle('c:\\workspace\\src\\a.ts', 3, '');

			Persist.saveTaskmarksJson();

			expect(taskManager.activeTask.files[0].filepath).to.equal('\\src\\a.ts');
			expect(lastSaved().persistTasks[0].persistFiles[0].filepath).to.equal('/src/a.ts');
		});

		it('should keep / in a file that is used on a system with the other separator', () => {
			systemSeparator = '\\';
			PathHelper.basePath = 'c:\\workspace';
			load(taskmarksJson('default', [taskWithMark('default', '/src/a.ts', 3)]));
			expect(taskManager.activeTask.files[0].filepath).to.equal('\\src\\a.ts');
			taskManager.activeTask.toggle('c:\\workspace\\src\\b.ts', 5, '');

			Persist.saveTaskmarksJson();

			expect(lastSaved().persistTasks[0].persistFiles.map((file) => file.filepath)).to.deep.equal(['/src/a.ts', '/src/b.ts']);
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

	describe('reloadIfChangedOnDisk', () => {
		const loaded = taskmarksJson('default', [taskWithMark('default', fileA, 3), taskWithMark('other', '/src/b.ts', 7)]);

		// someone else writes the file: a pull, a checkout, an editor
		function changeOnDisk(json: string | undefined): void {
			fileContent = json;
		}

		function unreadableWarningShown(): boolean {
			return showWarningMessage.getCalls().some((call) => String(call.args[0]).includes("can't be read"));
		}

		beforeEach(() => {
			load(loaded);
		});

		it('should do nothing while the file has the content that was loaded', async () => {
			const task = taskManager.activeTask;
			expect(await Persist.reloadIfChangedOnDisk()).to.be.false;
			expect(taskManager.activeTask).to.equal(task);
		});

		it('should do nothing after its own save', async () => {
			taskManager.activeTask.toggle(fullPathA, 5, '');
			Persist.saveTaskmarksJson();
			const task = taskManager.activeTask;

			expect(await Persist.reloadIfChangedOnDisk()).to.be.false;
			expect(taskManager.activeTask).to.equal(task);
			expect(task.getFile(fileA)?.lineNumbers).to.deep.equal([3, 5]);
		});

		it('should keep the tasks when the file was deleted, and write it again with the next change', async () => {
			changeOnDisk(undefined);
			expect(await Persist.reloadIfChangedOnDisk()).to.be.false;
			expect(taskManager.activeTask.getFile(fileA)?.hasMark(3)).to.be.true;

			taskManager.activeTask.toggle(fullPathA, 5, '');
			Persist.saveTaskmarksJson();
			expect(saveTaskmarks.calledOnce).to.be.true;
		});

		it('should replace the tasks with the ones from the file: new marks appear, removed marks and tasks are gone', async () => {
			changeOnDisk(taskmarksJson('default', [taskWithMark('default', fileA, 9, 'from a teammate'), taskWithMark('new', '/src/c.ts', 1)]));

			expect(await Persist.reloadIfChangedOnDisk()).to.be.true;

			expect(taskManager.taskNames).to.deep.equal(['default', 'new']);
			expect(taskManager.activeTask.getFile(fileA)?.allPersistMarks).to.deep.equal([{ lineNumber: 9, label: 'from a teammate' }]);
			expect(showWarningMessage.called).to.be.false;
		});

		it('should not write the file after loading it', async () => {
			changeOnDisk(taskmarksJson('default', [taskWithMark('default', fileA, 9)]));
			await Persist.reloadIfChangedOnDisk();
			Persist.saveTaskmarksJson();
			expect(saveTaskmarks.called).to.be.false;
		});

		it('should stay in the own active task, even if the file names another one', async () => {
			taskManager.useActiveTask('other');
			Persist.saveTaskmarksJson();
			changeOnDisk(taskmarksJson('default', [taskWithMark('default', fileA, 3), taskWithMark('other', '/src/b.ts', 8)]));

			await Persist.reloadIfChangedOnDisk();

			expect(taskManager.activeTask.name).to.equal('other');
			expect(taskManager.activeTask.getFile('/src/b.ts')?.lineNumbers).to.deep.equal([8]);
		});

		it('should switch to the active task of the file if the own one no longer exists', async () => {
			taskManager.useActiveTask('other');
			Persist.saveTaskmarksJson();
			changeOnDisk(taskmarksJson('third', [taskWithMark('default', fileA, 3), taskWithMark('third', '/src/c.ts', 1)]));

			await Persist.reloadIfChangedOnDisk();

			expect(taskManager.activeTask.name).to.equal('third');
		});

		it('should back up a file in an older format', async () => {
			const oldJson = taskmarksJson('default', [taskWithMark('default', fileA, 9)], 'none');
			changeOnDisk(oldJson);
			await Persist.reloadIfChangedOnDisk();
			expect(writeBackup.calledOnceWithExactly('v1', oldJson)).to.be.true;
		});

		it('should take over the path separator of the new file', async () => {
			changeOnDisk(taskmarksJson('default', [taskWithMark('default', '\\src\\a.ts', 9)]));
			await Persist.reloadIfChangedOnDisk();
			taskManager.activeTask.toggle('/workspace/src/b.ts', 1, '');

			Persist.saveTaskmarksJson();

			expect(lastSaved().persistTasks[0].persistFiles.map((file) => file.filepath)).to.deep.equal(['\\src\\a.ts', '\\src\\b.ts']);
		});

		it('should load a file of a newer format, warn and no longer save', async () => {
			changeOnDisk(taskmarksJson('default', [taskWithMark('default', fileA, 9)], 99));

			expect(await Persist.reloadIfChangedOnDisk()).to.be.true;
			expect(showWarningMessage.calledOnce).to.be.true;

			taskManager.activeTask.toggle(fullPathA, 5, '');
			Persist.saveTaskmarksJson();
			expect(saveTaskmarks.called).to.be.false;
		});

		it('should load the file without asking when changes could not be saved because its format was newer', async () => {
			changeOnDisk(taskmarksJson('default', [taskWithMark('default', fileA, 9)], 99));
			await Persist.reloadIfChangedOnDisk();
			taskManager.activeTask.toggle(fullPathA, 5, '');
			changeOnDisk(taskmarksJson('default', [taskWithMark('default', fileA, 1)]));

			expect(await Persist.reloadIfChangedOnDisk()).to.be.true;

			expect(taskManager.activeTask.getFile(fileA)?.lineNumbers).to.deep.equal([1]);
			taskManager.activeTask.toggle(fullPathA, 5, '');
			Persist.saveTaskmarksJson();
			expect(saveTaskmarks.calledOnce).to.be.true;
		});

		describe('when the file can not be read', () => {
			const conflict = '<<<<<<< HEAD\n{ "version": 2 }\n=======\n';

			it('should keep the tasks, warn and write no backup', async () => {
				changeOnDisk(conflict);

				expect(await Persist.reloadIfChangedOnDisk()).to.be.false;

				expect(taskManager.activeTask.getFile(fileA)?.hasMark(3)).to.be.true;
				expect(unreadableWarningShown()).to.be.true;
				expect(writeBackup.called).to.be.false;
			});

			it('should not save over the file', async () => {
				changeOnDisk(conflict);
				await Persist.reloadIfChangedOnDisk();
				taskManager.activeTask.toggle(fullPathA, 5, '');

				Persist.saveTaskmarksJson();

				expect(saveTaskmarks.called).to.be.false;
				expect(fileContent).to.equal(conflict);
			});

			it('should warn only once for the same content', async () => {
				changeOnDisk(conflict);
				await Persist.reloadIfChangedOnDisk();
				await Persist.reloadIfChangedOnDisk();
				expect(showWarningMessage.calledOnce).to.be.true;
			});

			it('should back up the file and write the own bookmarks when the user chooses to overwrite', async () => {
				warningChoice = 'Overwrite with my bookmarks';
				changeOnDisk(conflict);

				expect(await Persist.reloadIfChangedOnDisk()).to.be.false;

				expect(writeBackup.calledOnceWithExactly('invalid', conflict)).to.be.true;
				expect(lastSaved().persistTasks.map((task) => task.name)).to.deep.equal(['default', 'other']);
			});

			it('should load the file once it can be read again', async () => {
				changeOnDisk(conflict);
				await Persist.reloadIfChangedOnDisk();
				changeOnDisk(taskmarksJson('default', [taskWithMark('default', fileA, 9)]));

				expect(await Persist.reloadIfChangedOnDisk()).to.be.true;

				expect(taskManager.activeTask.getFile(fileA)?.lineNumbers).to.deep.equal([9]);
				expect(showWarningMessage.calledOnce).to.be.true;
				taskManager.activeTask.toggle(fullPathA, 5, '');
				Persist.saveTaskmarksJson();
				expect(saveTaskmarks.calledOnce).to.be.true;
			});
		});

		describe('when there are bookmarks that are not saved yet', () => {
			const fromTeammate = taskmarksJson('default', [taskWithMark('default', fileA, 9)]);

			// a save that fails leaves a change that is only in memory
			beforeEach(() => {
				taskManager.activeTask.toggle(fullPathA, 5, '');
				saveTaskmarks.onFirstCall().throws(new Error('file is locked'));
				expect(() => Persist.saveTaskmarksJson()).to.throw();
				changeOnDisk(fromTeammate);
			});

			it('should ask what to do', async () => {
				await Persist.reloadIfChangedOnDisk();
				expect(showWarningMessage.calledOnce).to.be.true;
				expect(showWarningMessage.firstCall.args.slice(1)).to.deep.equal(['Load the file', 'Keep my bookmarks']);
			});

			it('should load the file if the user chooses that', async () => {
				warningChoice = 'Load the file';

				expect(await Persist.reloadIfChangedOnDisk()).to.be.true;

				expect(taskManager.activeTask.getFile(fileA)?.lineNumbers).to.deep.equal([9]);
				expect(fileContent).to.equal(fromTeammate);
			});

			it('should save the own bookmarks over the file if the user chooses that', async () => {
				warningChoice = 'Keep my bookmarks';

				expect(await Persist.reloadIfChangedOnDisk()).to.be.false;

				expect(taskManager.activeTask.getFile(fileA)?.lineNumbers).to.deep.equal([3, 5]);
				expect(lastSaved().persistTasks[0].persistFiles[0].persistMarks.map((mark) => mark.lineNumber)).to.deep.equal([3, 5]);
			});

			it('should change nothing if the user dismisses the question', async () => {
				expect(await Persist.reloadIfChangedOnDisk()).to.be.false;

				expect(taskManager.activeTask.getFile(fileA)?.lineNumbers).to.deep.equal([3, 5]);
				expect(fileContent).to.equal(fromTeammate);
			});
		});
	});

	describe('copyToClipboard', () => {
		it('should copy the paths with the separator of this system', () => {
			load(taskmarksJson('default', [taskWithMark('default', '\\src\\a.ts', 3)]));
			Persist.copyToClipboard();
			expect(JSON.parse(clipboardText).persistFiles[0].filepath).to.equal('/src/a.ts');
		});

		it('should put the active task on the clipboard', () => {
			load(taskmarksJson('default', [taskWithMark('default', fileA, 3, 'look here')]));
			Persist.copyToClipboard();
			expect(JSON.parse(clipboardText)).to.deep.equal(taskWithMark('default', fileA, 3, 'look here'));
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

	describe('pasteFromClipboard with labels that differ', () => {
		const question = "Taskmarks: 2 bookmarks have another label in the pasted task 'default' than in yours.";
		const pastedMessage = "Taskmarks: task 'default' pasted from the clipboard.";

		function labelsOfA(): string[] {
			return taskManager.activeTask.getFile(fileA)?.allPersistMarks.map((mark) => `${mark.lineNumber}: ${mark.label}`) ?? [];
		}

		beforeEach(() => {
			load(
				taskmarksJson('default', [
					{
						name: 'default',
						persistFiles: [
							{
								filepath: fileA,
								persistMarks: [
									{ lineNumber: 1, label: 'mine 1' },
									{ lineNumber: 2, label: 'mine 2' },
									{ lineNumber: 3, label: '' },
									{ lineNumber: 4, label: 'same' },
									{ lineNumber: 5, label: 'only mine' },
								],
							},
						],
					},
				])
			);
			clipboardText = JSON.stringify({
				name: 'default',
				persistFiles: [
					{
						filepath: fileA,
						persistMarks: [
							{ lineNumber: 1, label: 'theirs 1' },
							{ lineNumber: 2, label: 'theirs 2' },
							{ lineNumber: 3, label: 'only theirs' },
							{ lineNumber: 4, label: 'same' },
							{ lineNumber: 5, label: '' },
							{ lineNumber: 6, label: 'new mark' },
						],
					},
				],
			});
		});

		it('should ask once, say how many labels differ and offer Combine first', async () => {
			await Persist.pasteFromClipboard();

			const [message, options, ...buttons] = showInformationMessage.firstCall.args;
			expect(message).to.equal(question);
			expect(options.modal).to.be.true;
			expect(buttons).to.deep.equal(['Combine', 'Keep mine', 'Take theirs']);
		});

		it('should combine the labels that differ and leave the others alone', async () => {
			messageChoice = 'Combine';

			expect(await Persist.pasteFromClipboard()).to.be.true;

			expect(labelsOfA()).to.deep.equal(['1: mine 1 / theirs 1', '2: mine 2 / theirs 2', '3: only theirs', '4: same', '5: only mine', '6: new mark']);
			expect(showInformationMessage.lastCall.args[0]).to.equal(pastedMessage);
		});

		it('should keep the own labels', async () => {
			messageChoice = 'Keep mine';

			expect(await Persist.pasteFromClipboard()).to.be.true;

			expect(labelsOfA()).to.deep.equal(['1: mine 1', '2: mine 2', '3: only theirs', '4: same', '5: only mine', '6: new mark']);
		});

		it('should take the labels of the pasted task', async () => {
			messageChoice = 'Take theirs';

			expect(await Persist.pasteFromClipboard()).to.be.true;

			expect(labelsOfA()).to.deep.equal(['1: theirs 1', '2: theirs 2', '3: only theirs', '4: same', '5: only mine', '6: new mark']);
		});

		it('should paste nothing when the question is cancelled', async () => {
			expect(await Persist.pasteFromClipboard()).to.be.false;

			expect(labelsOfA()).to.deep.equal(['1: mine 1', '2: mine 2', '3: ', '4: same', '5: only mine']);
			expect(showInformationMessage.calledOnce).to.be.true;
		});

		it('should not repeat a label when the same task is pasted and combined twice', async () => {
			messageChoice = 'Combine';
			await Persist.pasteFromClipboard();
			await Persist.pasteFromClipboard();

			expect(labelsOfA().slice(0, 2)).to.deep.equal(['1: mine 1 / theirs 1', '2: mine 2 / theirs 2']);
		});

		it('should say "1 bookmark has" for a single label that differs', async () => {
			clipboardText = JSON.stringify({ name: 'default', persistFiles: [{ filepath: fileA, persistMarks: [{ lineNumber: 1, label: 'theirs 1' }] }] });
			await Persist.pasteFromClipboard();
			expect(showInformationMessage.firstCall.args[0]).to.equal("Taskmarks: 1 bookmark has another label in the pasted task 'default' than in yours.");
		});

		it('should not ask when the pasted task goes into a new task', async () => {
			clipboardText = clipboardText.replace('"name":"default"', '"name":"another task"');

			expect(await Persist.pasteFromClipboard()).to.be.true;

			expect(showInformationMessage.calledOnceWithExactly("Taskmarks: task 'another task' pasted from the clipboard.")).to.be.true;
		});

		it('should not ask when no label differs', async () => {
			clipboardText = JSON.stringify({
				name: 'default',
				persistFiles: [
					{
						filepath: fileA,
						persistMarks: [
							{ lineNumber: 3, label: 'only theirs' },
							{ lineNumber: 4, label: 'same' },
							{ lineNumber: 5, label: '' },
						],
					},
				],
			});

			expect(await Persist.pasteFromClipboard()).to.be.true;

			expect(showInformationMessage.calledOnceWithExactly(pastedMessage)).to.be.true;
		});
	});
});
