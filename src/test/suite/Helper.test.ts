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
