import * as vscode from 'vscode';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Helper } from '../../Helper';
import { DecoratorHelper } from '../../DecoratorHelper';
import { PathHelper } from '../../PathHelper';
import { Persist } from '../../Persist';
import { Task } from '../../Task';
import { TaskManager } from '../../TaskManager';

describe('Helper', () => {
	describe('getErrorMessage', () => {
		it('should return message from Error object', () => {
			const error = new Error('test error message');
			const message = Helper.getErrorMessage(error);
			expect(message).to.equal('test error message');
		});

		it('should return message from object with message property', () => {
			const error = { message: 'custom error' };
			const message = Helper.getErrorMessage(error);
			expect(message).to.equal('custom error');
		});

		it('should stringify non-error objects', () => {
			const error = { code: 404, status: 'not found' };
			const message = Helper.getErrorMessage(error);
			expect(message).to.equal('{"code":404,"status":"not found"}');
		});

		it('should convert string to error message', () => {
			const error = 'simple string error';
			const message = Helper.getErrorMessage(error);
			expect(message).to.equal('"simple string error"');
		});

		it('should convert number to error message', () => {
			const error = 42;
			const message = Helper.getErrorMessage(error);
			expect(message).to.equal('42');
		});

		it('should handle null', () => {
			const message = Helper.getErrorMessage(null);
			expect(message).to.equal('null');
		});

		it('should handle undefined', () => {
			const message = Helper.getErrorMessage(undefined);
			// JSON.stringify(undefined) returns undefined, which creates Error with empty message
			expect(message).to.equal('');
		});
	});

	describe('getErrorStack', () => {
		it('should return stack from Error object', () => {
			const error = new Error('test error');
			const stack = Helper.getErrorStack(error);
			expect(stack).to.be.a('string');
			expect(stack).to.include('Error: test error');
		});

		it('should return undefined stack for non-error objects', () => {
			const error = { message: 'no stack' };
			const stack = Helper.getErrorStack(error);
			expect(stack).to.be.undefined;
		});
	});

	describe('getMarkQuickPickItems', () => {
		let documents: Record<string, string[]>;
		let openTextDocument: sinon.SinonSpy;
		let reportError: sinon.SinonStub;
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

			task = new Task('list');
			task.toggle('/workspace/src/a.ts', 1, '');
		});

		afterEach(() => {
			sinon.restore();
			PathHelper.basePath = previousBasePath;
		});

		it('should show the text of the marked line, its line number as in the editor (from 1) and the file', async () => {
			const items = await Helper.getMarkQuickPickItems(task);
			expect(shown(items)).to.deep.equal([{ label: 'one', description: '2', detail: '/src/a.ts' }]);
		});

		it('should show the line text without its indentation', async () => {
			documents['/workspace/src/a.ts'][1] = '\t\t  one, indented  ';
			expect((await Helper.getMarkQuickPickItems(task))[0].label).to.equal('one, indented');
		});

		it('should show a placeholder for an empty line', async () => {
			documents['/workspace/src/a.ts'][1] = '\t';
			expect((await Helper.getMarkQuickPickItems(task))[0].label).to.equal('(empty line)');
		});

		it('should show a label as it was entered', async () => {
			task.toggle('/workspace/src/a.ts', 2, '  look here');
			expect((await Helper.getMarkQuickPickItems(task))[1].label).to.equal('  look here');
		});

		it('should carry the file path and the mark of each entry', async () => {
			const [item] = await Helper.getMarkQuickPickItems(task);
			expect(item.filepath).to.equal('/src/a.ts');
			expect(item.mark).to.equal(task.files[0].marks[0]);
		});

		it('should show the label instead of the line text if there is one', async () => {
			task.toggle('/workspace/src/a.ts', 2, 'look here');
			const items = await Helper.getMarkQuickPickItems(task);
			expect(items.map((item) => item.label)).to.deep.equal(['one', 'look here']);
		});

		it('should list the marks of all files, file by file, and open each file once', async () => {
			task.toggle('/workspace/src/b.ts', 0, '');
			task.toggle('/workspace/src/a.ts', 3, '');
			const items = await Helper.getMarkQuickPickItems(task);
			expect(shown(items)).to.deep.equal([
				{ label: 'one', description: '2', detail: '/src/a.ts' },
				{ label: 'three', description: '4', detail: '/src/a.ts' },
				{ label: 'first', description: '1', detail: '/src/b.ts' },
			]);
			expect(openTextDocument.callCount).to.equal(2);
		});

		it('should show the new line number and text after the mark has moved', async () => {
			await Helper.getMarkQuickPickItems(task);

			task.files[0].marks[0].lineNumber = 3;

			expect(shown(await Helper.getMarkQuickPickItems(task))).to.deep.equal([{ label: 'three', description: '4', detail: '/src/a.ts' }]);
		});

		it('should show the new text after the marked line was edited', async () => {
			await Helper.getMarkQuickPickItems(task);

			documents['/workspace/src/a.ts'][1] = 'one, edited';

			expect((await Helper.getMarkQuickPickItems(task))[0].label).to.equal('one, edited');
		});

		it('should leave out a mark behind the last line, without reporting an error', async () => {
			task.toggle('/workspace/src/a.ts', 4, '');
			const items = await Helper.getMarkQuickPickItems(task);
			expect(items.map((item) => item.description)).to.deep.equal(['2']);
			expect(reportError.called).to.be.false;
		});

		it('should report a file that could not be read, list the others and try again next time', async () => {
			task.toggle('/workspace/src/gone.ts', 0, '');
			task.toggle('/workspace/src/b.ts', 1, '');

			const items = await Helper.getMarkQuickPickItems(task);
			expect(items.map((item) => item.label)).to.deep.equal(['one', 'second']);
			expect(reportError.calledOnceWithExactly({ message: 'file not found' })).to.be.true;

			documents['/workspace/src/gone.ts'] = ['back again'];

			expect((await Helper.getMarkQuickPickItems(task)).map((item) => item.label)).to.deep.equal(['one', 'back again', 'second']);
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
		});

		afterEach(() => {
			sinon.restore();
			taskManager.delete('selectMark');
			PathHelper.basePath = previousBasePath;
		});

		it('should open the file of the chosen mark at its line', async () => {
			sinon.replace(vscode.window, 'showQuickPick', sinon.fake((items: vscode.QuickPickItem[]) => Promise.resolve(items[1])) as any);
			await Helper.selectMarkFromList();
			expect(openAndShow.calledOnceWithExactly('/src/a.ts', 3)).to.be.true;
		});

		it('should do nothing when the list is dismissed', async () => {
			sinon.replace(vscode.window, 'showQuickPick', sinon.fake.resolves(undefined) as any);
			await Helper.selectMarkFromList();
			expect(openAndShow.called).to.be.false;
		});
	});

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

		function fakeEditor(fileName: string, line: number): vscode.TextEditor {
			return { selection: { active: { line } }, document: { fileName, uri: { fsPath: fileName } } } as unknown as vscode.TextEditor;
		}

		function setActiveEditor(editor: vscode.TextEditor | undefined): void {
			(vscode.window as any).activeTextEditor = editor;
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
			(Helper as any)._activeEditor = undefined;

			saveTaskmarksJson = sinon.stub(Persist, 'saveTaskmarksJson');
			refresh = sinon.stub(DecoratorHelper, 'refresh');
			showInformationMessage = sinon.fake();
			sinon.replace(vscode.window, 'showInformationMessage', showInformationMessage as any);
			setEnableLabel(false);
			sinon.replace(vscode.workspace, 'getConfiguration', sinon.fake.returns({ get: () => enableLabel }) as any);
			showInputBox = sinon.fake(() => Promise.resolve(labelAnswer));
			sinon.replace(vscode.window, 'showInputBox', showInputBox as any);
		});

		afterEach(() => {
			sinon.restore();
			setActiveEditor(undefined);
			(Helper as any)._activeEditor = undefined;
			taskManager.delete('toggleMark');
			PathHelper.basePath = previousBasePath;
		});

		it('should do nothing without an active editor', async () => {
			setActiveEditor(undefined);
			await Helper.toggleMark();
			expect(task.hasMarks).to.be.false;
			expect(saveTaskmarksJson.called).to.be.false;
		});

		it('should set a mark on the active line and save', async () => {
			setActiveEditor(fakeEditor(fileInWorkspace, 4));
			await Helper.toggleMark();
			expect(task.getFile(reducedPath)?.allPersistMarks).to.deep.equal([{ lineNumber: 4, label: '' }]);
			expect(saveTaskmarksJson.calledOnce).to.be.true;
			expect(showInformationMessage.called).to.be.false;
		});

		it('should show the new mark in the active editor', async () => {
			const editor = fakeEditor(fileInWorkspace, 4);
			setActiveEditor(editor);
			await Helper.toggleMark();
			expect(refresh.calledOnceWithExactly(editor, [4])).to.be.true;
			expect(task.activeFile).to.equal(task.getFile(reducedPath));
		});

		it('should remove an existing mark and take the file out of the task', async () => {
			const editor = fakeEditor(fileInWorkspace, 4);
			setActiveEditor(editor);
			await Helper.toggleMark();
			await Helper.toggleMark();
			expect(task.files.length).to.equal(0);
			expect(saveTaskmarksJson.calledTwice).to.be.true;
			expect(refresh.lastCall.calledWithExactly(editor, [])).to.be.true;
		});

		it('should refuse a file outside the workspace folder', async () => {
			setActiveEditor(fakeEditor('d:\\other\\x.ts', 4));
			await Helper.toggleMark();
			expect(task.hasMarks).to.be.false;
			expect(showInformationMessage.calledOnceWithExactly(refusedMessage)).to.be.true;
			expect(saveTaskmarksJson.called).to.be.false;
		});

		it('should refuse a folder that only starts with the name of the workspace folder', async () => {
			setActiveEditor(fakeEditor('c:\\workspace2\\src\\a.ts', 4));
			await Helper.toggleMark();
			expect(task.hasMarks).to.be.false;
			expect(showInformationMessage.calledOnceWithExactly(refusedMessage)).to.be.true;
		});

		it('should refuse an untitled document', async () => {
			setActiveEditor(fakeEditor('Untitled-1', 0));
			await Helper.toggleMark();
			expect(task.hasMarks).to.be.false;
			expect(showInformationMessage.calledOnceWithExactly(refusedMessage)).to.be.true;
		});

		it('should not ask for a label in a file outside the workspace folder', async () => {
			setEnableLabel(true, 'look here');
			setActiveEditor(fakeEditor('d:\\other\\x.ts', 4));
			await Helper.toggleMark();
			await inputBoxAnswered();
			expect(showInputBox.called).to.be.false;
			expect(task.hasMarks).to.be.false;
		});

		it('should ask for a label and store it when labels are enabled', async () => {
			setEnableLabel(true, 'look here');
			setActiveEditor(fakeEditor(fileInWorkspace, 4));
			await Helper.toggleMark();
			await inputBoxAnswered();
			expect(showInputBox.calledOnce).to.be.true;
			expect(task.getFile(reducedPath)?.allPersistMarks).to.deep.equal([{ lineNumber: 4, label: 'look here' }]);
			expect(saveTaskmarksJson.calledOnce).to.be.true;
		});

		it('should not set a mark when the label input is cancelled', async () => {
			setEnableLabel(true, undefined);
			setActiveEditor(fakeEditor(fileInWorkspace, 4));
			await Helper.toggleMark();
			await inputBoxAnswered();
			expect(task.hasMarks).to.be.false;
		});

		it('should remove an existing mark without asking for a label', async () => {
			task.toggle(fileInWorkspace, 4, 'look here');
			setEnableLabel(true, 'another label');
			setActiveEditor(fakeEditor(fileInWorkspace, 4));
			await Helper.toggleMark();
			await inputBoxAnswered();
			expect(showInputBox.called).to.be.false;
			expect(task.hasMarks).to.be.false;
		});
	});
});
