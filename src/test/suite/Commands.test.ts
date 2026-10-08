import * as vscode from 'vscode';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Commands } from '../../Commands';
import { Helper } from '../../Helper';
import { DecoratorHelper } from '../../DecoratorHelper';
import { Breakpoints } from '../../Breakpoints';
import type { IPersistBreakpoint } from '../../types';
import { PathHelper } from '../../PathHelper';
import { Persist } from '../../Persist';
import { Task } from '../../Task';
import { TaskManager } from '../../TaskManager';

describe('Commands', () => {
	describe('toggleMark', () => {
		const basePath = 'c:\\workspace';
		const fileInWorkspace = 'c:\\workspace\\src\\a.ts';
		const reducedPath = '\\src\\a.ts';
		const refusedMessage = 'Taskmarks: bookmarks can only be set in files inside the workspace folder.';

		let taskManager: TaskManager;
		let task: Task;
		let previousBasePath: string;
		let saveTaskmarksJson: sinon.SinonStub;
		let refresh: sinon.SinonStub;
		let showInformationMessage: sinon.SinonSpy;
		let showInputBox: sinon.SinonSpy;
		let enableLabel: boolean;
		let labelAnswer: string | undefined;
		let activeEditor: vscode.TextEditor | undefined;

		function fakeEditor(fileName: string, line: number): vscode.TextEditor {
			return { selection: { active: { line } }, document: { fileName, uri: { fsPath: fileName } } } as unknown as vscode.TextEditor;
		}

		function setActiveEditor(editor: vscode.TextEditor | undefined): void {
			activeEditor = editor;
		}

		// labelAnswer is what the user types into the input box, undefined means cancelled
		function setEnableLabel(enable: boolean, answer?: string): void {
			enableLabel = enable;
			labelAnswer = answer;
		}

		// the label is toggled in the then() of showInputBox, after toggleMark has returned
		function inputBoxAnswered(): Promise<void> {
			return new Promise((resolve) => setImmediate(resolve));
		}

		beforeEach(() => {
			previousBasePath = PathHelper.basePath;
			PathHelper.basePath = basePath;

			taskManager = TaskManager.instance;
			taskManager.delete('toggleMark');
			task = taskManager.useActiveTask('toggleMark');
			(Helper as any)._taskManager = taskManager;

			// in a real VS Code (npm test) activeTextEditor has only a getter, so it can't be assigned
			activeEditor = undefined;
			sinon.stub(vscode.window, 'activeTextEditor').get(() => activeEditor);
			sinon.stub(vscode.window, 'visibleTextEditors').get(() => (activeEditor ? [activeEditor] : []));

			saveTaskmarksJson = sinon.stub(Persist, 'saveTaskmarksJson');
			refresh = sinon.stub(DecoratorHelper, 'refresh');
			showInformationMessage = sinon.fake();
			sinon.replace(vscode.window, 'showInformationMessage', showInformationMessage as any);
			setEnableLabel(false);
			sinon.replace(
				vscode.workspace,
				'getConfiguration',
				sinon.fake.returns({ get: (setting: string) => (setting === 'taskmarks.enableLabel' ? enableLabel : undefined) }) as any
			);
			showInputBox = sinon.fake(() => Promise.resolve(labelAnswer));
			sinon.replace(vscode.window, 'showInputBox', showInputBox as any);
		});

		afterEach(() => {
			sinon.restore();
			taskManager.delete('toggleMark');
			PathHelper.basePath = previousBasePath;
		});

		it('should do nothing without an active editor', async () => {
			setActiveEditor(undefined);
			await Commands.toggleMark();
			expect(task.hasMarks).to.be.false;
			expect(saveTaskmarksJson.called).to.be.false;
		});

		it('should set a mark on the active line and save', async () => {
			setActiveEditor(fakeEditor(fileInWorkspace, 4));
			await Commands.toggleMark();
			expect(task.getFile(reducedPath)?.allPersistMarks).to.deep.equal([{ lineNumber: 4, label: '' }]);
			expect(saveTaskmarksJson.calledOnce).to.be.true;
			expect(showInformationMessage.called).to.be.false;
		});

		it('should show the new mark in the active editor', async () => {
			const editor = fakeEditor(fileInWorkspace, 4);
			setActiveEditor(editor);
			await Commands.toggleMark();
			expect(refresh.calledOnceWithExactly(editor, [{ lineNumber: 4, label: '' }], true)).to.be.true;
			expect(task.activeFile).to.equal(task.getFile(reducedPath));
		});

		it('should remove an existing mark and take the file out of the task', async () => {
			const editor = fakeEditor(fileInWorkspace, 4);
			setActiveEditor(editor);
			await Commands.toggleMark();
			await Commands.toggleMark();
			expect(task.files.length).to.equal(0);
			expect(saveTaskmarksJson.calledTwice).to.be.true;
			expect(refresh.lastCall.calledWithExactly(editor, [], true)).to.be.true;
		});

		it('should refuse a file outside the workspace folder', async () => {
			setActiveEditor(fakeEditor('d:\\other\\x.ts', 4));
			await Commands.toggleMark();
			expect(task.hasMarks).to.be.false;
			expect(showInformationMessage.calledOnceWithExactly(refusedMessage)).to.be.true;
			expect(saveTaskmarksJson.called).to.be.false;
		});

		it('should refuse a folder that only starts with the name of the workspace folder', async () => {
			setActiveEditor(fakeEditor('c:\\workspace2\\src\\a.ts', 4));
			await Commands.toggleMark();
			expect(task.hasMarks).to.be.false;
			expect(showInformationMessage.calledOnceWithExactly(refusedMessage)).to.be.true;
		});

		it('should refuse an untitled document', async () => {
			setActiveEditor(fakeEditor('Untitled-1', 0));
			await Commands.toggleMark();
			expect(task.hasMarks).to.be.false;
			expect(showInformationMessage.calledOnceWithExactly(refusedMessage)).to.be.true;
		});

		it('should not ask for a label in a file outside the workspace folder', async () => {
			setEnableLabel(true, 'look here');
			setActiveEditor(fakeEditor('d:\\other\\x.ts', 4));
			await Commands.toggleMark();
			await inputBoxAnswered();
			expect(showInputBox.called).to.be.false;
			expect(task.hasMarks).to.be.false;
		});

		it('should ask for a label and store it when labels are enabled', async () => {
			setEnableLabel(true, 'look here');
			setActiveEditor(fakeEditor(fileInWorkspace, 4));
			await Commands.toggleMark();
			await inputBoxAnswered();
			expect(showInputBox.calledOnce).to.be.true;
			expect(task.getFile(reducedPath)?.allPersistMarks).to.deep.equal([{ lineNumber: 4, label: 'look here' }]);
			expect(saveTaskmarksJson.calledOnce).to.be.true;
		});

		it('should set a mark without label when the label input is left empty', async () => {
			setEnableLabel(true, '');
			setActiveEditor(fakeEditor(fileInWorkspace, 4));
			await Commands.toggleMark();
			await inputBoxAnswered();
			expect(task.getFile(reducedPath)?.allPersistMarks).to.deep.equal([{ lineNumber: 4, label: '' }]);
			expect(saveTaskmarksJson.calledOnce).to.be.true;
		});

		it('should not set a mark when the label input is cancelled', async () => {
			setEnableLabel(true, undefined);
			setActiveEditor(fakeEditor(fileInWorkspace, 4));
			await Commands.toggleMark();
			await inputBoxAnswered();
			expect(task.hasMarks).to.be.false;
		});

		it('should remove an existing mark without asking for a label', async () => {
			task.toggle(fileInWorkspace, 4, 'look here');
			setEnableLabel(true, 'another label');
			setActiveEditor(fakeEditor(fileInWorkspace, 4));
			await Commands.toggleMark();
			await inputBoxAnswered();
			expect(showInputBox.called).to.be.false;
			expect(task.hasMarks).to.be.false;
		});
	});

	describe('nextMark / previousMark', () => {
		let taskManager: TaskManager;
		let previousBasePath: string;
		let openAndShow: sinon.SinonStub;
		let showLine: sinon.SinonStub;
		let task: Task;
		// files with marks that are not on disk, e.g. marked by a teammate on another branch
		let missingFiles: string[];
		// where the cursor is: nextMark and previousMark start from the active file and this line
		let cursorLine: number;
		let hasActiveEditor: boolean;

		function use(filepath: string, line = 0): void {
			task.use(filepath);
			cursorLine = line;
		}

		beforeEach(() => {
			previousBasePath = PathHelper.basePath;
			PathHelper.basePath = '/workspace';
			taskManager = TaskManager.instance;
			(Helper as any)._taskManager = taskManager;
			openAndShow = sinon.stub(DecoratorHelper, 'openAndShow');
			showLine = sinon.stub(DecoratorHelper, 'showLine');
			missingFiles = [];
			sinon.stub(PathHelper, 'fileExists').callsFake((filepath: string) => !missingFiles.includes(filepath));
			cursorLine = 0;
			hasActiveEditor = true;
			sinon.stub(vscode.window, 'activeTextEditor').get(() => (hasActiveEditor ? { selection: { active: { line: cursorLine } } } : undefined));
			taskManager.delete('navigation');
			task = taskManager.useActiveTask('navigation');
			task.toggle('/a.ts', 1, '');
			task.toggle('/a.ts', 9, '');
			task.toggle('/b.ts', 2, '');
			task.toggle('/c.ts', 3, '');
		});

		afterEach(() => {
			sinon.restore();
			taskManager.delete('navigation');
			PathHelper.basePath = previousBasePath;
		});

		it('should go to the next mark in the active file', async () => {
			use('/a.ts', 1);
			await Commands.nextMark();
			expect(showLine.calledOnceWithExactly(9)).to.be.true;
			expect(openAndShow.called).to.be.false;
		});

		it('should go to the previous mark in the active file', async () => {
			use('/a.ts', 9);
			await Commands.previousMark();
			expect(showLine.calledOnceWithExactly(1)).to.be.true;
			expect(openAndShow.called).to.be.false;
		});

		it('should go to the first mark of the next file when the active file has no further mark', async () => {
			use('/a.ts', 9);
			await Commands.nextMark();
			expect(openAndShow.calledOnceWithExactly('/b.ts', 2)).to.be.true;
			expect(showLine.called).to.be.false;
		});

		it('should go to the last mark of the previous file when the active file has no mark above', async () => {
			use('/b.ts', 2);
			await Commands.previousMark();
			expect(openAndShow.calledOnceWithExactly('/a.ts', 9)).to.be.true;
		});

		// no text editor is active when all editors are closed, or when the active tab is not a text file (Settings, an image)
		it('should go to the first mark of the task when no text editor is active', async () => {
			use('/b.ts', 1);
			hasActiveEditor = false;
			await Commands.nextMark();
			expect(openAndShow.calledOnceWithExactly('/a.ts', 1)).to.be.true;
			expect(showLine.called).to.be.false;
		});

		it('should go to the last mark of the task with "previous" when no text editor is active', async () => {
			use('/b.ts', 1);
			hasActiveEditor = false;
			await Commands.previousMark();
			expect(openAndShow.calledOnceWithExactly('/c.ts', 3)).to.be.true;
		});

		it('should leave out files that do not exist when no text editor is active', async () => {
			missingFiles = ['/a.ts', '/c.ts'];
			hasActiveEditor = false;
			await Commands.nextMark();
			await Commands.previousMark();
			expect(openAndShow.args).to.deep.equal([
				['/b.ts', 2],
				['/b.ts', 2],
			]);
		});

		it('should do nothing without a text editor when the task has no marks', async () => {
			taskManager.delete('navigation');
			task = taskManager.useActiveTask('navigation');
			hasActiveEditor = false;
			await Commands.nextMark();
			await Commands.previousMark();
			expect(openAndShow.called).to.be.false;
		});

		it('should report an error instead of throwing', async () => {
			const reportError = sinon.stub(Helper, 'reportError');
			openAndShow.rejects(new Error('no editor'));
			use('/a.ts', 9);
			await Commands.nextMark();
			expect(reportError.calledOnceWithExactly({ message: 'no editor' })).to.be.true;
		});

		it('should skip a file that does not exist and go on to the one after it', async () => {
			missingFiles = ['/b.ts'];
			use('/a.ts');
			await Commands.nextDocument();
			expect(openAndShow.calledOnceWithExactly('/c.ts', 3)).to.be.true;
		});

		it('should skip a file that does not exist when going back', async () => {
			missingFiles = ['/b.ts'];
			use('/c.ts');
			await Commands.previousDocument();
			expect(openAndShow.calledOnceWithExactly('/a.ts', 9)).to.be.true;
		});

		it('should wrap around past a missing file at the end', async () => {
			missingFiles = ['/c.ts'];
			use('/b.ts');
			await Commands.nextDocument();
			expect(openAndShow.calledOnceWithExactly('/a.ts', 1)).to.be.true;
		});

		it('should do nothing when none of the files exists', async () => {
			missingFiles = ['/a.ts', '/b.ts', '/c.ts'];
			use('/a.ts');
			await Commands.nextDocument();
			await Commands.previousDocument();
			expect(openAndShow.called).to.be.false;
		});

		it('should go to the file after the active file, not after the last added one', async () => {
			use('/a.ts');
			await Commands.nextDocument();
			expect(openAndShow.calledOnceWithExactly('/b.ts', 2)).to.be.true;
		});

		it('should wrap from the last file to the first', async () => {
			use('/c.ts');
			await Commands.nextDocument();
			expect(openAndShow.calledOnceWithExactly('/a.ts', 1)).to.be.true;
		});

		it('should go to the last mark of the file before the active file', async () => {
			use('/b.ts');
			await Commands.previousDocument();
			expect(openAndShow.calledOnceWithExactly('/a.ts', 9)).to.be.true;
		});

		it('should wrap from the first file to the last', async () => {
			use('/a.ts');
			await Commands.previousDocument();
			expect(openAndShow.calledOnceWithExactly('/c.ts', 3)).to.be.true;
		});

		it('should do nothing when no file has marks', async () => {
			taskManager.delete('navigation');
			task = taskManager.useActiveTask('navigation');
			use('/empty.ts');
			await Commands.nextDocument();
			await Commands.previousDocument();
			expect(openAndShow.called).to.be.false;
		});

		it('should still find a file when the active file is no longer part of the task', async () => {
			use('/b.ts');
			task.toggle('/b.ts', 2, '');
			await Commands.nextDocument();
			expect(openAndShow.calledOnceWithExactly('/a.ts', 1)).to.be.true;
		});
	});

	describe('getMarkQuickPickItems', () => {
		let documents: Record<string, string[]>;
		let openTextDocument: sinon.SinonSpy;
		let reportError: sinon.SinonStub;
		// files with marks that are not on disk, e.g. marked by a teammate on another branch
		let missingFiles: string[];
		let previousBasePath: string;
		let task: Task;

		function shown(items: vscode.QuickPickItem[]) {
			return items.map(({ label, description, detail }) => ({ label, description, detail }));
		}

		beforeEach(() => {
			previousBasePath = PathHelper.basePath;
			PathHelper.basePath = '/workspace';
			documents = {
				'/workspace/src/a.ts': ['zero', 'one', 'two', 'three'],
				'/workspace/src/b.ts': ['first', 'second'],
			};
			sinon.replace(vscode.Uri, 'file', sinon.fake((path: string) => ({ fsPath: path })) as any);
			openTextDocument = sinon.fake((uri: { fsPath: string }) => {
				const lines = documents[uri.fsPath];
				if (!lines) {
					return Promise.reject(new Error('file not found'));
				}
				return Promise.resolve({
					lineCount: lines.length,
					lineAt: (line: number) => {
						if (line < 0 || line >= lines.length) {
							throw new Error('Illegal value for `line`');
						}
						return { text: lines[line] };
					},
				});
			});
			sinon.replace(vscode.workspace, 'openTextDocument', openTextDocument as any);
			reportError = sinon.stub(Helper, 'reportError');
			missingFiles = [];
			sinon.stub(PathHelper, 'fileExists').callsFake((filepath: string) => !missingFiles.includes(filepath));

			task = new Task('list');
			task.toggle('/workspace/src/a.ts', 1, '');
		});

		afterEach(() => {
			sinon.restore();
			PathHelper.basePath = previousBasePath;
		});

		it('should show the text of the marked line, its line number as in the editor (from 1) and the file', async () => {
			const items = await Commands.getMarkQuickPickItems(task);
			expect(shown(items)).to.deep.equal([{ label: 'one', description: '2', detail: '/src/a.ts' }]);
		});

		it('should show the line text without its indentation', async () => {
			documents['/workspace/src/a.ts'][1] = '\t\t  one, indented  ';
			expect((await Commands.getMarkQuickPickItems(task))[0].label).to.equal('one, indented');
		});

		it('should show a placeholder for an empty line', async () => {
			documents['/workspace/src/a.ts'][1] = '\t';
			expect((await Commands.getMarkQuickPickItems(task))[0].label).to.equal('(empty line)');
		});

		it('should show a label as it was entered', async () => {
			task.toggle('/workspace/src/a.ts', 2, '  look here');
			expect((await Commands.getMarkQuickPickItems(task))[1].label).to.equal('  look here');
		});

		it('should carry the file path and the mark of each entry', async () => {
			const [item] = await Commands.getMarkQuickPickItems(task);
			expect(item.filepath).to.equal('/src/a.ts');
			expect(item.mark).to.equal(task.files[0].marks[0]);
		});

		it('should show the label instead of the line text if there is one', async () => {
			task.toggle('/workspace/src/a.ts', 2, 'look here');
			const items = await Commands.getMarkQuickPickItems(task);
			expect(items.map((item) => item.label)).to.deep.equal(['one', 'look here']);
		});

		it('should list the marks of all files, file by file, and open each file once', async () => {
			task.toggle('/workspace/src/b.ts', 0, '');
			task.toggle('/workspace/src/a.ts', 3, '');
			const items = await Commands.getMarkQuickPickItems(task);
			expect(shown(items)).to.deep.equal([
				{ label: 'one', description: '2', detail: '/src/a.ts' },
				{ label: 'three', description: '4', detail: '/src/a.ts' },
				{ label: 'first', description: '1', detail: '/src/b.ts' },
			]);
			expect(openTextDocument.callCount).to.equal(2);
		});

		it('should show the new line number and text after the mark has moved', async () => {
			await Commands.getMarkQuickPickItems(task);

			task.files[0].marks[0].lineNumber = 3;

			expect(shown(await Commands.getMarkQuickPickItems(task))).to.deep.equal([{ label: 'three', description: '4', detail: '/src/a.ts' }]);
		});

		it('should show the new text after the marked line was edited', async () => {
			await Commands.getMarkQuickPickItems(task);

			documents['/workspace/src/a.ts'][1] = 'one, edited';

			expect((await Commands.getMarkQuickPickItems(task))[0].label).to.equal('one, edited');
		});

		it('should leave out a mark behind the last line, without reporting an error', async () => {
			task.toggle('/workspace/src/a.ts', 4, '');
			const items = await Commands.getMarkQuickPickItems(task);
			expect(items.map((item) => item.description)).to.deep.equal(['2']);
			expect(reportError.called).to.be.false;
		});

		it('should leave out a file that does not exist, without reporting an error', async () => {
			task.toggle('/workspace/src/only-on-another-branch.ts', 0, '');
			task.toggle('/workspace/src/b.ts', 1, '');
			missingFiles = ['/src/only-on-another-branch.ts'];

			const items = await Commands.getMarkQuickPickItems(task);

			expect(items.map((item) => item.label)).to.deep.equal(['one', 'second']);
			expect(reportError.called).to.be.false;
			expect(openTextDocument.callCount).to.equal(2);
		});

		it('should report a file that could not be read, list the others and try again next time', async () => {
			task.toggle('/workspace/src/gone.ts', 0, '');
			task.toggle('/workspace/src/b.ts', 1, '');

			const items = await Commands.getMarkQuickPickItems(task);
			expect(items.map((item) => item.label)).to.deep.equal(['one', 'second']);
			expect(reportError.calledOnceWithExactly({ message: 'file not found' })).to.be.true;

			documents['/workspace/src/gone.ts'] = ['back again'];

			expect((await Commands.getMarkQuickPickItems(task)).map((item) => item.label)).to.deep.equal(['one', 'back again', 'second']);
		});
	});

	describe('selectMarkFromList', () => {
		let taskManager: TaskManager;
		let task: Task;
		let previousBasePath: string;
		let openAndShow: sinon.SinonStub;

		beforeEach(() => {
			previousBasePath = PathHelper.basePath;
			PathHelper.basePath = '/workspace';
			taskManager = TaskManager.instance;
			taskManager.delete('selectMark');
			task = taskManager.useActiveTask('selectMark');
			(Helper as any)._taskManager = taskManager;
			task.toggle('/workspace/src/a.ts', 1, '');
			task.toggle('/workspace/src/a.ts', 3, 'look here');

			const lines = ['zero', 'one', 'two', 'three'];
			sinon.replace(vscode.workspace, 'openTextDocument', sinon.fake.resolves({ lineCount: lines.length, lineAt: (line: number) => ({ text: lines[line] }) }) as any);
			openAndShow = sinon.stub(DecoratorHelper, 'openAndShow');
			sinon.stub(PathHelper, 'fileExists').returns(true);
		});

		afterEach(() => {
			sinon.restore();
			taskManager.delete('selectMark');
			PathHelper.basePath = previousBasePath;
		});

		it('should open the file of the chosen mark at its line', async () => {
			sinon.replace(vscode.window, 'showQuickPick', sinon.fake((items: vscode.QuickPickItem[]) => Promise.resolve(items[1])) as any);
			await Commands.selectMarkFromList();
			expect(openAndShow.calledOnceWithExactly('/src/a.ts', 3)).to.be.true;
		});

		it('should do nothing when the list is dismissed', async () => {
			sinon.replace(vscode.window, 'showQuickPick', sinon.fake.resolves(undefined) as any);
			await Commands.selectMarkFromList();
			expect(openAndShow.called).to.be.false;
		});
	});

	describe('task commands', () => {
		let taskManager: TaskManager;
		let previousBasePath: string;
		let saveTaskmarksJson: sinon.SinonStub;
		let refresh: sinon.SinonStub;
		let reportError: sinon.SinonStub;
		let showWarningMessage: sinon.SinonSpy;
		let showQuickPick: sinon.SinonSpy;
		let showInputBox: sinon.SinonSpy;
		let showInformationMessage: sinon.SinonSpy;
		const createEntry = '$(add) Create new task…';
		// what the user picks from a list, types into an input box, clicks in a question - undefined: cancelled
		let picked: string | undefined;
		let typed: string | undefined;
		let clicked: string | undefined;
		const names = ['cmd-a', 'cmd-b', 'cmd-new'];

		beforeEach(() => {
			previousBasePath = PathHelper.basePath;
			PathHelper.basePath = '/workspace';
			taskManager = TaskManager.instance;
			(Helper as any)._taskManager = taskManager;
			taskManager.useActiveTask('cmd-b');
			taskManager.useActiveTask('cmd-a');

			picked = undefined;
			typed = undefined;
			clicked = undefined;
			// a list has plain names or entries with a label - the user picks by what is shown
			showQuickPick = sinon.fake((items: (string | vscode.QuickPickItem)[]) => Promise.resolve(items.find((item) => (typeof item === 'string' ? item : item.label) === picked)));
			sinon.replace(vscode.window, 'showQuickPick', showQuickPick as any);
			showInputBox = sinon.fake(() => Promise.resolve(typed));
			sinon.replace(vscode.window, 'showInputBox', showInputBox as any);
			showInformationMessage = sinon.fake();
			sinon.replace(vscode.window, 'showInformationMessage', showInformationMessage as any);
			showWarningMessage = sinon.fake(() => Promise.resolve(clicked));
			sinon.replace(vscode.window, 'showWarningMessage', showWarningMessage as any);
			saveTaskmarksJson = sinon.stub(Persist, 'saveTaskmarksJson');
			refresh = sinon.stub(Helper, 'refresh');
			reportError = sinon.stub(Helper, 'reportError');
		});

		afterEach(() => {
			sinon.restore();
			names.forEach((name) => taskManager.delete(name));
			PathHelper.basePath = previousBasePath;
		});

		describe('selectTask', () => {
			function offered(): vscode.QuickPickItem[] {
				return showQuickPick.firstCall.args[0];
			}

			it('should offer the active task first', async () => {
				await Commands.selectTask();
				expect(offered()[0].label).to.equal('cmd-a');
				expect(offered().map((item) => item.label)).to.include('cmd-b');
			});

			it('should offer to create a new task as the last entry, also while the list is filtered', async () => {
				await Commands.selectTask();
				const last = offered()[offered().length - 1];
				expect(last.label).to.equal(createEntry);
				expect(last.alwaysShow).to.be.true;
				// only the entry for a new task stays when the typed text matches no task
				expect(offered().filter((item) => item.alwaysShow).length).to.equal(1);
			});

			it('should ask for the name and create the task when that entry is picked', async () => {
				picked = createEntry;
				typed = 'cmd-new';

				await Commands.selectTask();

				expect(showInputBox.calledOnce).to.be.true;
				expect(taskManager.activeTask.name).to.equal('cmd-new');
				expect(refresh.calledOnce).to.be.true;
				expect(saveTaskmarksJson.calledOnce).to.be.true;
			});

			it('should change nothing when the name for the new task is not entered', async () => {
				picked = createEntry;

				await Commands.selectTask();

				expect(taskManager.activeTask.name).to.equal('cmd-a');
				expect(taskManager.taskNames).to.not.include('cmd-new');
				expect(saveTaskmarksJson.called).to.be.false;
			});

			it('should not take a task for the entry, even if it has the same name', async () => {
				taskManager.useActiveTask(createEntry);
				taskManager.useActiveTask('cmd-a');
				picked = createEntry;

				await Commands.selectTask();
				taskManager.delete(createEntry);

				// the first entry with that label is the task
				expect(showInputBox.called).to.be.false;
			});

			it('should make the picked task the active one, show its marks and save', async () => {
				picked = 'cmd-b';
				await Commands.selectTask();
				expect(taskManager.activeTask.name).to.equal('cmd-b');
				expect(refresh.calledOnce).to.be.true;
				expect(saveTaskmarksJson.calledOnce).to.be.true;
			});

			it('should show the breakpoints of the picked task', async () => {
				let shownFor = '';
				sinon.stub(Breakpoints, 'showActiveTask').callsFake(() => {
					shownFor = taskManager.activeTask.name;
				});
				picked = 'cmd-b';

				await Commands.selectTask();

				expect(shownFor).to.equal('cmd-b');
			});

			it('should do nothing when the list is dismissed', async () => {
				await Commands.selectTask();
				expect(taskManager.activeTask.name).to.equal('cmd-a');
				expect(refresh.called).to.be.false;
				expect(saveTaskmarksJson.called).to.be.false;
			});

			it('should report an error instead of throwing', async () => {
				sinon.restore();
				reportError = sinon.stub(Helper, 'reportError');
				sinon.replace(vscode.window, 'showQuickPick', sinon.fake.rejects(new Error('no list')) as any);
				await Commands.selectTask();
				expect(reportError.calledOnceWithExactly({ message: 'no list' })).to.be.true;
			});
		});

		describe('createTask', () => {
			it('should create the task, make it the active one and save', async () => {
				typed = 'cmd-new';
				await Commands.createTask();
				expect(taskManager.activeTask.name).to.equal('cmd-new');
				expect(taskManager.taskNames).to.include('cmd-new');
				expect(saveTaskmarksJson.calledOnce).to.be.true;
			});

			it('should do nothing when the input is cancelled or empty', async () => {
				await Commands.createTask();
				typed = '';
				await Commands.createTask();
				expect(taskManager.activeTask.name).to.equal('cmd-a');
				expect(saveTaskmarksJson.called).to.be.false;
			});

			it('should not say anything about a task that is new', async () => {
				typed = 'cmd-new';
				await Commands.createTask();
				expect(showInformationMessage.called).to.be.false;
			});

			it('should switch to a task that already has that name, and say so', async () => {
				const existing = taskManager.allTasks.find((task) => task.name === 'cmd-b');
				typed = 'cmd-b';

				await Commands.createTask();

				expect(taskManager.activeTask).to.equal(existing);
				expect(taskManager.taskNames.filter((name) => name === 'cmd-b').length).to.equal(1);
				expect(showInformationMessage.calledOnceWithExactly("Taskmarks: there is already a task named 'cmd-b'. It is the active task now.")).to.be.true;
				expect(saveTaskmarksJson.calledOnce).to.be.true;
			});
		});

		describe('deleteTask', () => {
			it('should delete a task without bookmarks without asking', async () => {
				picked = 'cmd-b';
				await Commands.deleteTask();
				expect(taskManager.taskNames).to.not.include('cmd-b');
				expect(showWarningMessage.called).to.be.false;
				expect(saveTaskmarksJson.calledOnce).to.be.true;
			});

			it('should ask before deleting a task with bookmarks and say how many are lost', async () => {
				const task = taskManager.allTasks.find((task) => task.name === 'cmd-b')!;
				task.toggle('/workspace/src/a.ts', 1, '');
				task.toggle('/workspace/src/a.ts', 2, '');
				task.toggle('/workspace/src/b.ts', 3, '');
				picked = 'cmd-b';

				await Commands.deleteTask();

				expect(showWarningMessage.calledOnceWithExactly("Delete task 'cmd-b' with its 3 bookmarks?", { modal: true }, 'Delete')).to.be.true;
			});

			it('should ask before deleting a task with breakpoints', async () => {
				sinon.stub(Breakpoints, 'countOfTask').callsFake((taskName: string) => (taskName === 'cmd-b' ? 2 : 0));
				picked = 'cmd-b';

				await Commands.deleteTask();

				expect(showWarningMessage.calledOnceWithExactly("Delete task 'cmd-b' with its 2 breakpoints?", { modal: true }, 'Delete')).to.be.true;
				expect(taskManager.taskNames).to.include('cmd-b');
			});

			it('should name bookmarks and breakpoints when the task has both', async () => {
				sinon.stub(Breakpoints, 'countOfTask').returns(1);
				taskManager.allTasks.find((task) => task.name === 'cmd-b')!.toggle('/workspace/src/a.ts', 1, '');
				picked = 'cmd-b';

				await Commands.deleteTask();

				expect(showWarningMessage.calledOnceWithExactly("Delete task 'cmd-b' with its bookmark and its breakpoint?", { modal: true }, 'Delete')).to.be.true;
			});

			it('should let the breakpoints of the deleted task go, then show the ones of the active task', async () => {
				const taskDeleted = sinon.stub(Breakpoints, 'taskDeleted');
				const showActiveTask = sinon.stub(Breakpoints, 'showActiveTask');
				picked = 'cmd-a';

				await Commands.deleteTask();

				expect(taskDeleted.calledOnceWithExactly('cmd-a')).to.be.true;
				expect(showActiveTask.calledOnce).to.be.true;
				expect(taskDeleted.calledBefore(showActiveTask)).to.be.true;
			});

			it('should keep the task when the question is not answered with Delete', async () => {
				taskManager.allTasks.find((task) => task.name === 'cmd-b')!.toggle('/workspace/src/a.ts', 1, '');
				picked = 'cmd-b';

				await Commands.deleteTask();

				expect(showWarningMessage.calledOnceWithExactly("Delete task 'cmd-b' with its bookmark?", { modal: true }, 'Delete')).to.be.true;
				expect(taskManager.taskNames).to.include('cmd-b');
				expect(saveTaskmarksJson.called).to.be.false;
			});

			it('should delete the task when the question is answered with Delete', async () => {
				taskManager.allTasks.find((task) => task.name === 'cmd-b')!.toggle('/workspace/src/a.ts', 1, '');
				picked = 'cmd-b';
				clicked = 'Delete';

				await Commands.deleteTask();

				expect(taskManager.taskNames).to.not.include('cmd-b');
				expect(saveTaskmarksJson.calledOnce).to.be.true;
			});

			it('should switch to the default task when the active task is deleted', async () => {
				picked = 'cmd-a';
				await Commands.deleteTask();
				expect(taskManager.activeTask.name).to.equal('default');
				expect(refresh.calledOnce).to.be.true;
			});

			it('should do nothing when the list is dismissed', async () => {
				await Commands.deleteTask();
				expect(taskManager.taskNames).to.include.members(['cmd-a', 'cmd-b']);
				expect(saveTaskmarksJson.called).to.be.false;
			});
		});
	});

	describe('renameTask', () => {
		let taskManager: TaskManager;
		let saveTaskmarksJson: sinon.SinonStub;
		let showInformationMessage: sinon.SinonSpy;
		let namesWhenSaved: string[];
		let refresh: sinon.SinonStub;

		// answers of the user: the task picked from the list, then the name typed into the input box
		function answer(pickedTask: string | undefined, newName: string | undefined): void {
			sinon.replace(vscode.window, 'showQuickPick', sinon.fake.resolves(pickedTask) as any);
			sinon.replace(vscode.window, 'showInputBox', sinon.fake.resolves(newName) as any);
		}

		function answered(): Promise<void> {
			return new Promise((resolve) => setImmediate(resolve));
		}

		beforeEach(() => {
			taskManager = TaskManager.instance;
			(Helper as any)._taskManager = taskManager;
			taskManager.useActiveTask('helper-rename-a');
			taskManager.useActiveTask('helper-rename-b');
			namesWhenSaved = [];
			saveTaskmarksJson = sinon.stub(Persist, 'saveTaskmarksJson').callsFake(() => {
				namesWhenSaved = [...taskManager.taskNames];
			});
			refresh = sinon.stub(Helper, 'refresh');
			showInformationMessage = sinon.fake();
			sinon.replace(vscode.window, 'showInformationMessage', showInformationMessage as any);
		});

		afterEach(() => {
			sinon.restore();
			['helper-rename-a', 'helper-rename-b', 'helper-rename-c'].forEach((name) => taskManager.delete(name));
		});

		it('should rename the picked task and save after the rename', async () => {
			answer('helper-rename-b', 'helper-rename-c');
			await Commands.renameTask();
			await answered();
			expect(taskManager.taskNames).to.include('helper-rename-c');
			expect(taskManager.taskNames).to.not.include('helper-rename-b');
			expect(saveTaskmarksJson.calledOnce).to.be.true;
			expect(namesWhenSaved).to.include('helper-rename-c');
			expect(refresh.calledOnce).to.be.true;
		});

		it('should keep the breakpoints with the renamed task', async () => {
			const taskRenamed = sinon.stub(Breakpoints, 'taskRenamed');
			answer('helper-rename-b', 'helper-rename-c');
			await Commands.renameTask();
			await answered();
			expect(taskRenamed.calledOnceWithExactly('helper-rename-b', 'helper-rename-c')).to.be.true;
		});

		it('should refuse a name that another task already has and say so', async () => {
			answer('helper-rename-b', 'helper-rename-a');
			await Commands.renameTask();
			await answered();
			expect(taskManager.taskNames.filter((name) => name === 'helper-rename-a').length).to.equal(1);
			expect(taskManager.taskNames).to.include('helper-rename-b');
			expect(showInformationMessage.calledOnceWithExactly("Taskmarks: there is already a task named 'helper-rename-a'.")).to.be.true;
			expect(saveTaskmarksJson.called).to.be.false;
		});

		it('should do nothing when the name input is cancelled', async () => {
			answer('helper-rename-b', undefined);
			await Commands.renameTask();
			await answered();
			expect(taskManager.taskNames).to.include('helper-rename-b');
			expect(saveTaskmarksJson.called).to.be.false;
		});

		it('should do nothing when no task is picked', async () => {
			answer(undefined, 'helper-rename-c');
			await Commands.renameTask();
			await answered();
			expect(taskManager.taskNames).to.not.include('helper-rename-c');
			expect(saveTaskmarksJson.called).to.be.false;
		});
	});

	describe('shared breakpoints', () => {
		const fileA = '/src/a.ts';
		const fileB = '/src/b.ts';
		let taskManager: TaskManager;
		let previousBasePath: string;
		let saveTaskmarksJson: sinon.SinonStub;
		let showWarningMessage: sinon.SinonSpy;
		let showInformationMessage: sinon.SinonSpy;
		// the breakpoints that are set in VS Code
		let current: IPersistBreakpoint[];
		let add: sinon.SinonStub;
		// the button the user clicks in a question, undefined: cancelled
		let clicked: string | undefined;
		let filesOnDisk: string[];

		beforeEach(() => {
			previousBasePath = PathHelper.basePath;
			PathHelper.basePath = '/workspace';
			taskManager = TaskManager.instance;
			(Helper as any)._taskManager = taskManager;
			taskManager.useActiveTask('bp-other');
			taskManager.useActiveTask('bp-task');

			current = [];
			sinon.stub(Breakpoints, 'current').callsFake(() => current);
			add = sinon.stub(Breakpoints, 'add');
			filesOnDisk = [fileA, fileB];
			sinon.stub(PathHelper, 'fileExists').callsFake((filepath: string) => filesOnDisk.includes(filepath));
			clicked = undefined;
			showWarningMessage = sinon.fake(() => Promise.resolve(clicked));
			sinon.replace(vscode.window, 'showWarningMessage', showWarningMessage as any);
			showInformationMessage = sinon.fake();
			sinon.replace(vscode.window, 'showInformationMessage', showInformationMessage as any);
			saveTaskmarksJson = sinon.stub(Persist, 'saveTaskmarksJson');
		});

		afterEach(() => {
			sinon.restore();
			['bp-task', 'bp-other'].forEach((name) => taskManager.delete(name));
			PathHelper.basePath = previousBasePath;
		});

		describe('shareBreakpoints', () => {
			it('should ask before the first breakpoints are shared, as older versions do not save such a file', async () => {
				current = [{ filepath: fileA, lineNumber: 3 }];

				await Commands.shareBreakpoints();

				expect(showWarningMessage.calledOnce).to.be.true;
				expect(showWarningMessage.firstCall.args[0]).to.equal("Share the breakpoints of task 'bp-task' in taskmarks.json?");
				expect(showWarningMessage.firstCall.args[1].modal).to.be.true;
				expect(showWarningMessage.firstCall.args[1].detail).to.include('1.2.0 or older');
				expect(taskManager.activeTask.sharedBreakpoints).to.deep.equal([]);
				expect(saveTaskmarksJson.called).to.be.false;
			});

			it('should put the breakpoints that are set into the active task, sorted, and save', async () => {
				current = [
					{ filepath: fileB, lineNumber: 7, condition: 'x' },
					{ filepath: fileA, lineNumber: 3 },
				];
				clicked = 'Share';

				await Commands.shareBreakpoints();

				expect(taskManager.activeTask.sharedBreakpoints).to.deep.equal([
					{ filepath: fileA, lineNumber: 3 },
					{ filepath: fileB, lineNumber: 7, condition: 'x' },
				]);
				expect(saveTaskmarksJson.calledOnce).to.be.true;
				expect(showInformationMessage.calledOnceWithExactly("Taskmarks: task 'bp-task' shares 2 breakpoints in taskmarks.json.")).to.be.true;
			});

			it('should not ask again while a task shares breakpoints, and replace what the task shared', async () => {
				taskManager.allTasks.find((task) => task.name === 'bp-other')!.sharedBreakpoints = [{ filepath: fileB, lineNumber: 1 }];
				taskManager.activeTask.sharedBreakpoints = [{ filepath: fileA, lineNumber: 99 }];
				current = [{ filepath: fileA, lineNumber: 3 }];

				await Commands.shareBreakpoints();

				expect(showWarningMessage.called).to.be.false;
				expect(taskManager.activeTask.sharedBreakpoints).to.deep.equal([{ filepath: fileA, lineNumber: 3 }]);
				expect(showInformationMessage.calledOnceWithExactly("Taskmarks: task 'bp-task' shares 1 breakpoint in taskmarks.json.")).to.be.true;
			});

			it('should say so when there is nothing to share', async () => {
				await Commands.shareBreakpoints();

				expect(showInformationMessage.calledOnceWithExactly('Taskmarks: there are no breakpoints in files of the workspace folder that could be shared.')).to.be.true;
				expect(saveTaskmarksJson.called).to.be.false;
			});

			it('should ask before the shared breakpoints are removed because none is set', async () => {
				taskManager.activeTask.sharedBreakpoints = [{ filepath: fileA, lineNumber: 3 }];

				await Commands.shareBreakpoints();

				expect(
					showWarningMessage.calledOnceWithExactly(
						"Task 'bp-task' shares 1 breakpoint, but none is set here. Remove the shared breakpoints from taskmarks.json?",
						{ modal: true },
						'Remove'
					)
				).to.be.true;
				expect(taskManager.activeTask.sharedBreakpoints).to.deep.equal([{ filepath: fileA, lineNumber: 3 }]);
				expect(saveTaskmarksJson.called).to.be.false;
			});

			it('should remove the shared breakpoints when that is confirmed', async () => {
				taskManager.activeTask.sharedBreakpoints = [
					{ filepath: fileA, lineNumber: 3 },
					{ filepath: fileA, lineNumber: 4 },
				];
				clicked = 'Remove';

				await Commands.shareBreakpoints();

				expect(showWarningMessage.firstCall.args[0]).to.include('shares 2 breakpoints');
				expect(taskManager.activeTask.sharedBreakpoints).to.deep.equal([]);
				expect(saveTaskmarksJson.calledOnce).to.be.true;
				expect(showInformationMessage.calledOnceWithExactly("Taskmarks: task 'bp-task' shares no breakpoints anymore.")).to.be.true;
			});

			it('should report an error instead of throwing', async () => {
				const reportError = sinon.stub(Helper, 'reportError');
				(Breakpoints.current as sinon.SinonStub).throws(new Error('no breakpoints'));
				await Commands.shareBreakpoints();
				expect(reportError.calledOnceWithExactly({ message: 'no breakpoints' })).to.be.true;
			});
		});

		describe('loadSharedBreakpoints', () => {
			it('should set the shared breakpoints that are not set yet and keep the own ones', async () => {
				taskManager.activeTask.sharedBreakpoints = [
					{ filepath: fileA, lineNumber: 3, condition: 'theirs' },
					{ filepath: fileB, lineNumber: 7 },
				];
				current = [{ filepath: fileA, lineNumber: 3, condition: 'mine' }];

				await Commands.loadSharedBreakpoints();

				expect(add.calledOnceWithExactly([{ filepath: fileB, lineNumber: 7 }])).to.be.true;
				expect(showInformationMessage.calledOnceWithExactly("Taskmarks: 1 of the 2 shared breakpoints of task 'bp-task' set.")).to.be.true;
				expect(saveTaskmarksJson.called).to.be.false;
			});

			it('should say so when all of them are set already', async () => {
				taskManager.activeTask.sharedBreakpoints = [{ filepath: fileA, lineNumber: 3 }];
				current = [{ filepath: fileA, lineNumber: 3 }];

				await Commands.loadSharedBreakpoints();

				expect(add.calledOnceWithExactly([])).to.be.true;
				expect(showInformationMessage.calledOnceWithExactly("Taskmarks: the shared breakpoints of task 'bp-task' are set already.")).to.be.true;
			});

			it('should leave out the breakpoints of files that do not exist here', async () => {
				taskManager.activeTask.sharedBreakpoints = [
					{ filepath: fileA, lineNumber: 3 },
					{ filepath: '/src/teammate.ts', lineNumber: 7 },
				];

				await Commands.loadSharedBreakpoints();

				expect(add.calledOnceWithExactly([{ filepath: fileA, lineNumber: 3 }])).to.be.true;
				expect(showInformationMessage.calledOnceWithExactly("Taskmarks: 1 of the 1 shared breakpoints of task 'bp-task' set.")).to.be.true;
			});

			it('should say so when the task shares no breakpoints', async () => {
				await Commands.loadSharedBreakpoints();
				expect(add.called).to.be.false;
				expect(showInformationMessage.calledOnceWithExactly("Taskmarks: task 'bp-task' has no shared breakpoints.")).to.be.true;
			});

			it('should say so when the task only shares breakpoints of files that do not exist here', async () => {
				taskManager.activeTask.sharedBreakpoints = [{ filepath: '/src/teammate.ts', lineNumber: 7 }];
				await Commands.loadSharedBreakpoints();
				expect(add.called).to.be.false;
				expect(showInformationMessage.calledOnceWithExactly("Taskmarks: task 'bp-task' has no shared breakpoints in files that exist here.")).to.be.true;
			});

			it('should report an error instead of throwing', async () => {
				const reportError = sinon.stub(Helper, 'reportError');
				taskManager.activeTask.sharedBreakpoints = [{ filepath: fileA, lineNumber: 3 }];
				add.throws(new Error('no debugger'));
				await Commands.loadSharedBreakpoints();
				expect(reportError.calledOnceWithExactly({ message: 'no debugger' })).to.be.true;
			});
		});
	});

	describe('pasteFromClipboard', () => {
		let refresh: sinon.SinonStub;
		let saveTaskmarksJson: sinon.SinonStub;
		let reportError: sinon.SinonStub;

		beforeEach(() => {
			refresh = sinon.stub(Helper, 'refresh');
			saveTaskmarksJson = sinon.stub(Persist, 'saveTaskmarksJson');
			reportError = sinon.stub(Helper, 'reportError');
		});

		afterEach(() => {
			sinon.restore();
		});

		it('should refresh the editor and save after a task was pasted', async () => {
			const paste = sinon.stub(Persist, 'pasteFromClipboard').resolves(true);
			await Commands.pasteFromClipboard();
			expect(refresh.calledOnce).to.be.true;
			expect(saveTaskmarksJson.calledOnce).to.be.true;
			expect(refresh.calledAfter(paste)).to.be.true;
		});

		it('should neither refresh nor save when nothing was pasted', async () => {
			sinon.stub(Persist, 'pasteFromClipboard').resolves(false);
			await Commands.pasteFromClipboard();
			expect(refresh.called).to.be.false;
			expect(saveTaskmarksJson.called).to.be.false;
		});

		it('should report a file that could not be saved instead of throwing', async () => {
			sinon.stub(Persist, 'pasteFromClipboard').resolves(true);
			saveTaskmarksJson.throws(new Error('file is locked'));
			await Commands.pasteFromClipboard();
			expect(reportError.calledOnceWithExactly({ message: 'taskmarks.json could not be saved: file is locked' })).to.be.true;
		});

		it('should report a clipboard that could not be read', async () => {
			sinon.stub(Persist, 'pasteFromClipboard').rejects(new Error('no clipboard'));
			await Commands.pasteFromClipboard();
			expect(reportError.calledOnceWithExactly({ message: 'no clipboard' })).to.be.true;
		});
	});

	describe('copyToClipboard', () => {
		afterEach(() => {
			sinon.restore();
		});

		it('should copy the active task', () => {
			const copyToClipboard = sinon.stub(Persist, 'copyToClipboard');
			Commands.copyToClipboard();
			expect(copyToClipboard.calledOnce).to.be.true;
		});
	});

	describe('errors', () => {
		const commands: [string, () => Promise<void>][] = [
			['toggleMark', () => Commands.toggleMark()],
			['editLabel', () => Commands.editLabel()],
			['toggleMarkAtLine', () => Commands.toggleMarkAtLine()],
			['editLabelAtLine', () => Commands.editLabelAtLine()],
			['nextMark', () => Commands.nextMark()],
			['previousMark', () => Commands.previousMark()],
			['selectMarkFromList', () => Commands.selectMarkFromList()],
			['selectTask', () => Commands.selectTask()],
			['renameTask', () => Commands.renameTask()],
			['createTask', () => Commands.createTask()],
			['deleteTask', () => Commands.deleteTask()],
		];
		let reportError: sinon.SinonStub;

		beforeEach(() => {
			// every command gets as far as asking for the tasks, and that fails
			sinon.stub(vscode.window, 'activeTextEditor').get(() => ({ selection: { active: { line: 0 } }, document: { fileName: '/workspace/a.ts' } }));
			sinon.replace(vscode.window, 'showInputBox', sinon.fake.resolves('a name') as any);
			sinon.stub(Helper, 'taskManager').get(() => {
				throw new Error('no tasks');
			});
			reportError = sinon.stub(Helper, 'reportError');
		});

		afterEach(() => {
			sinon.restore();
		});

		commands.forEach(([name, command]) => {
			it(`should report an error in ${name} instead of throwing`, async () => {
				await command();
				expect(reportError.calledOnceWithExactly({ message: 'no tasks' })).to.be.true;
			});
		});
	});

	describe('editLabel', () => {
		const fileInWorkspace = '/workspace/src/a.ts';
		let taskManager: TaskManager;
		let task: Task;
		let previousBasePath: string;
		let saveTaskmarksJson: sinon.SinonStub;
		let showInformationMessage: sinon.SinonSpy;
		let showInputBox: sinon.SinonSpy;
		let cursorLine: number;
		// what the user types into the input box, undefined: cancelled
		let typed: string | undefined;
		let refresh: sinon.SinonStub;

		beforeEach(() => {
			previousBasePath = PathHelper.basePath;
			PathHelper.basePath = '/workspace';
			taskManager = TaskManager.instance;
			(Helper as any)._taskManager = taskManager;
			taskManager.delete('editLabel');
			task = taskManager.useActiveTask('editLabel');
			task.toggle(fileInWorkspace, 4, 'old label');
			task.toggle(fileInWorkspace, 8, '');

			cursorLine = 4;
			typed = undefined;
			sinon.stub(vscode.window, 'activeTextEditor').get(() => ({ selection: { active: { line: cursorLine } }, document: { fileName: fileInWorkspace } }));
			showInputBox = sinon.fake(() => Promise.resolve(typed));
			sinon.replace(vscode.window, 'showInputBox', showInputBox as any);
			showInformationMessage = sinon.fake();
			sinon.replace(vscode.window, 'showInformationMessage', showInformationMessage as any);
			saveTaskmarksJson = sinon.stub(Persist, 'saveTaskmarksJson');
			refresh = sinon.stub(Helper, 'refresh');
		});

		afterEach(() => {
			sinon.restore();
			taskManager.delete('editLabel');
			PathHelper.basePath = previousBasePath;
		});

		it('should offer the current label and store the new one', async () => {
			typed = 'new label';

			await Commands.editLabel();

			expect(showInputBox.firstCall.args[0].value).to.equal('old label');
			expect(task.getFile('/src/a.ts')?.allPersistMarks).to.deep.equal([
				{ lineNumber: 4, label: 'new label' },
				{ lineNumber: 8, label: '' },
			]);
			expect(saveTaskmarksJson.calledOnce).to.be.true;
			// the label is shown behind its line
			expect(refresh.calledOnce).to.be.true;
		});

		it('should give a label to a bookmark that has none', async () => {
			cursorLine = 8;
			typed = 'now with label';

			await Commands.editLabel();

			expect(showInputBox.firstCall.args[0].value).to.equal('');
			expect(task.getFile('/src/a.ts')?.getMark(8)?.label).to.equal('now with label');
		});

		it('should remove the label when the box is emptied', async () => {
			typed = '';
			await Commands.editLabel();
			expect(task.getFile('/src/a.ts')?.getMark(4)?.label).to.equal('');
			expect(saveTaskmarksJson.calledOnce).to.be.true;
		});

		it('should change nothing when the input is cancelled', async () => {
			await Commands.editLabel();
			expect(task.getFile('/src/a.ts')?.getMark(4)?.label).to.equal('old label');
			expect(saveTaskmarksJson.called).to.be.false;
			expect(refresh.called).to.be.false;
		});

		it('should not save when the label is left as it is', async () => {
			typed = 'old label';
			await Commands.editLabel();
			expect(saveTaskmarksJson.called).to.be.false;
		});

		it('should say so when the line has no bookmark', async () => {
			cursorLine = 5;

			await Commands.editLabel();

			expect(showInformationMessage.calledOnceWithExactly('Taskmarks: there is no bookmark in this line.')).to.be.true;
			expect(showInputBox.called).to.be.false;
		});

		it('should say so in a file without bookmarks', async () => {
			sinon.restore();
			showInformationMessage = sinon.fake();
			sinon.replace(vscode.window, 'showInformationMessage', showInformationMessage as any);
			sinon.stub(vscode.window, 'activeTextEditor').get(() => ({ selection: { active: { line: 4 } }, document: { fileName: '/workspace/src/b.ts' } }));

			await Commands.editLabel();

			expect(showInformationMessage.calledOnceWithExactly('Taskmarks: there is no bookmark in this line.')).to.be.true;
		});

		it('should work while labels are not enabled', async () => {
			sinon.replace(vscode.workspace, 'getConfiguration', sinon.fake.returns({ get: () => false }) as any);
			typed = 'new label';
			await Commands.editLabel();
			expect(task.getFile('/src/a.ts')?.getMark(4)?.label).to.equal('new label');
		});

		it('should do nothing without an active editor', async () => {
			sinon.restore();
			sinon.stub(vscode.window, 'activeTextEditor').get(() => undefined);
			showInputBox = sinon.fake();
			sinon.replace(vscode.window, 'showInputBox', showInputBox as any);

			await Commands.editLabel();

			expect(showInputBox.called).to.be.false;
		});
	});

	describe('menu of the line numbers', () => {
		const fileA = '/workspace/src/a.ts';
		const fileB = '/workspace/src/b.ts';
		let taskManager: TaskManager;
		let task: Task;
		let previousBasePath: string;
		let saveTaskmarksJson: sinon.SinonStub;
		let refresh: sinon.SinonStub;
		let showInformationMessage: sinon.SinonSpy;
		let showInputBox: sinon.SinonSpy;
		let enableLabel: boolean;
		let typed: string | undefined;
		let hasActiveEditor: boolean;

		// what VS Code hands to the command: the line counted from 1 and the document
		function clicked(fsPath: string, lineNumber: number) {
			return { lineNumber, uri: { fsPath } as vscode.Uri };
		}

		beforeEach(() => {
			previousBasePath = PathHelper.basePath;
			PathHelper.basePath = '/workspace';
			taskManager = TaskManager.instance;
			(Helper as any)._taskManager = taskManager;
			taskManager.delete('lineMenu');
			task = taskManager.useActiveTask('lineMenu');
			task.toggle(fileA, 4, 'old label');

			// the cursor is somewhere else: in line 20 of a.ts
			hasActiveEditor = true;
			sinon.stub(vscode.window, 'activeTextEditor').get(() => (hasActiveEditor ? { selection: { active: { line: 20 } }, document: { fileName: fileA, uri: { fsPath: fileA } } } : undefined));
			enableLabel = false;
			typed = undefined;
			sinon.replace(
				vscode.workspace,
				'getConfiguration',
				sinon.fake.returns({ get: (setting: string) => (setting === 'taskmarks.enableLabel' ? enableLabel : undefined) }) as any
			);
			showInputBox = sinon.fake(() => Promise.resolve(typed));
			sinon.replace(vscode.window, 'showInputBox', showInputBox as any);
			showInformationMessage = sinon.fake();
			sinon.replace(vscode.window, 'showInformationMessage', showInformationMessage as any);
			saveTaskmarksJson = sinon.stub(Persist, 'saveTaskmarksJson');
			refresh = sinon.stub(Helper, 'refresh');
		});

		afterEach(() => {
			sinon.restore();
			taskManager.delete('lineMenu');
			PathHelper.basePath = previousBasePath;
		});

		describe('toggleMarkAtLine', () => {
			it('should set a mark on the clicked line, not on the line of the cursor', async () => {
				await Commands.toggleMarkAtLine(clicked(fileA, 11));

				expect(task.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([4, 10]);
				expect(saveTaskmarksJson.calledOnce).to.be.true;
				expect(refresh.calledOnce).to.be.true;
			});

			it('should remove the mark of the clicked line', async () => {
				await Commands.toggleMarkAtLine(clicked(fileA, 5));
				expect(task.files.length).to.equal(0);
			});

			it('should set the mark in the clicked file, also if another file is in the active editor', async () => {
				await Commands.toggleMarkAtLine(clicked(fileB, 1));
				expect(task.getFile('/src/b.ts')?.lineNumbers).to.deep.equal([0]);
				expect(task.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([4]);
			});

			it('should ask for a label when labels are enabled', async () => {
				enableLabel = true;
				typed = 'from the menu';

				await Commands.toggleMarkAtLine(clicked(fileA, 11));

				expect(task.getFile('/src/a.ts')?.getMark(10)?.label).to.equal('from the menu');
			});

			it('should refuse a file outside the workspace folder', async () => {
				await Commands.toggleMarkAtLine(clicked('/elsewhere/x.ts', 1));

				expect(showInformationMessage.calledOnceWithExactly('Taskmarks: bookmarks can only be set in files inside the workspace folder.')).to.be.true;
				expect(saveTaskmarksJson.called).to.be.false;
			});

			it('should use the line of the cursor when it is run without a clicked line', async () => {
				await Commands.toggleMarkAtLine();
				expect(task.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([4, 20]);
			});

			it('should do nothing without a clicked line and without an editor', async () => {
				hasActiveEditor = false;
				await Commands.toggleMarkAtLine();
				expect(saveTaskmarksJson.called).to.be.false;
			});
		});

		describe('editLabelAtLine', () => {
			it('should change the label of the mark on the clicked line', async () => {
				typed = 'new label';

				await Commands.editLabelAtLine(clicked(fileA, 5));

				expect(showInputBox.firstCall.args[0].value).to.equal('old label');
				expect(task.getFile('/src/a.ts')?.getMark(4)?.label).to.equal('new label');
				expect(saveTaskmarksJson.calledOnce).to.be.true;
			});

			it('should say so when the clicked line has no bookmark', async () => {
				await Commands.editLabelAtLine(clicked(fileA, 6));

				expect(showInformationMessage.calledOnceWithExactly('Taskmarks: there is no bookmark in this line.')).to.be.true;
				expect(showInputBox.called).to.be.false;
			});

			it('should say so when the line is only marked in another file', async () => {
				await Commands.editLabelAtLine(clicked(fileB, 5));
				expect(showInformationMessage.calledOnceWithExactly('Taskmarks: there is no bookmark in this line.')).to.be.true;
			});
		});
	});
});
