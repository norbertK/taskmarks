import * as vscode from 'vscode';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Helper } from '../../Helper';
import { DecoratorHelper } from '../../DecoratorHelper';
import { MarkTracker } from '../../MarkTracker';
import { PathHelper } from '../../PathHelper';
import { Persist } from '../../Persist';
import { TaskManager } from '../../TaskManager';

describe('Helper', () => {
	describe('taskmarksFileChanged', () => {
		let taskManager: TaskManager;
		let refresh: sinon.SinonStub;
		let reportError: sinon.SinonStub;
		let previousBasePath: string;
		const editor = { selection: { active: { line: 0 } }, document: { fileName: '/workspace/src/a.ts', uri: { fsPath: '/workspace/src/a.ts' } } } as unknown as vscode.TextEditor;

		beforeEach(() => {
			previousBasePath = PathHelper.basePath;
			PathHelper.basePath = '/workspace';
			taskManager = TaskManager.instance;
			(Helper as any)._taskManager = taskManager;
			taskManager.useActiveTask('file-changed').toggle('/workspace/src/a.ts', 3, '');
			sinon.stub(vscode.window, 'activeTextEditor').get(() => editor);
			sinon.stub(vscode.window, 'visibleTextEditors').get(() => [editor]);
			(MarkTracker as any)._markRemovals.set(
				taskManager.activeTask,
				new Map([['/src/a.ts', [{ startLine: 1, startCharacter: 0, replacedLines: 1, insertedLines: 0, marks: [] }]]])
			);
			refresh = sinon.stub(DecoratorHelper, 'refresh');
			reportError = sinon.stub(Helper, 'reportError');
		});

		afterEach(() => {
			sinon.restore();
			(MarkTracker as any)._markRemovals.clear();
			taskManager.delete('file-changed');
			PathHelper.basePath = previousBasePath;
		});

		it('should show the marks of the reloaded tasks in the editor and forget the removed marks', async () => {
			sinon.stub(Persist, 'reloadIfChangedOnDisk').callsFake(() => {
				taskManager.replaceTasks([{ name: 'file-changed', persistFiles: [{ filepath: '/src/a.ts', persistMarks: [{ lineNumber: 8, label: '' }] }] }], 'file-changed');
				return Promise.resolve(true);
			});

			await Helper.taskmarksFileChanged();

			expect(refresh.calledOnceWithExactly(editor, [8])).to.be.true;
			expect(taskManager.activeTask.activeFile).to.equal(taskManager.activeTask.getFile('/src/a.ts'));
			expect((MarkTracker as any)._markRemovals.size).to.equal(0);
		});

		it('should do nothing when the tasks were not reloaded', async () => {
			sinon.stub(Persist, 'reloadIfChangedOnDisk').resolves(false);

			await Helper.taskmarksFileChanged();

			expect(refresh.called).to.be.false;
			expect((MarkTracker as any)._markRemovals.size).to.equal(1);
		});

		it('should report an error instead of throwing', async () => {
			sinon.stub(Persist, 'reloadIfChangedOnDisk').rejects(new Error('disk is gone'));
			await Helper.taskmarksFileChanged();
			expect(reportError.calledOnceWithExactly({ message: 'disk is gone' })).to.be.true;
		});
	});

	describe('documentChanged', () => {
		const event = {} as vscode.TextDocumentChangeEvent;
		let saveTaskmarksJson: sinon.SinonStub;
		let refresh: sinon.SinonStub;
		let reportError: sinon.SinonStub;

		beforeEach(() => {
			(Helper as any)._taskManager = TaskManager.instance;
			saveTaskmarksJson = sinon.stub(Persist, 'saveTaskmarksJson');
			refresh = sinon.stub(Helper, 'refresh');
			reportError = sinon.stub(Helper, 'reportError');
		});

		afterEach(() => {
			sinon.restore();
		});

		it('should refresh the editors and save once when marks have changed', () => {
			const documentChanged = sinon.stub(MarkTracker, 'documentChanged').returns(true);

			Helper.documentChanged(event);

			expect(documentChanged.calledOnceWithExactly(event, TaskManager.instance.allTasks)).to.be.true;
			expect(refresh.calledOnce).to.be.true;
			expect(saveTaskmarksJson.calledOnce).to.be.true;
		});

		it('should neither refresh nor save when no mark has changed', () => {
			sinon.stub(MarkTracker, 'documentChanged').returns(false);

			Helper.documentChanged(event);

			expect(refresh.called).to.be.false;
			expect(saveTaskmarksJson.called).to.be.false;
		});

		it('should report an error instead of throwing', () => {
			sinon.stub(MarkTracker, 'documentChanged').throws(new Error('broken change'));
			Helper.documentChanged(event);
			expect(reportError.calledOnceWithExactly({ message: 'broken change' })).to.be.true;
		});
	});

	describe('save', () => {
		afterEach(() => {
			sinon.restore();
		});

		it('should report a file that could not be written instead of throwing', () => {
			sinon.stub(Persist, 'saveTaskmarksJson').throws(new Error('file is locked'));
			const reportError = sinon.stub(Helper, 'reportError');
			Helper.save();
			expect(reportError.calledOnceWithExactly({ message: 'taskmarks.json could not be saved: file is locked' })).to.be.true;
		});
	});

	describe('getErrorMessage / getErrorStack', () => {
		it('should give message and stack of an error', () => {
			const error = new Error('test error message');
			expect(Helper.getErrorMessage(error)).to.equal('test error message');
			expect(Helper.getErrorStack(error)).to.include('Error: test error message');
		});
	});

	describe('refresh', () => {
		let taskManager: TaskManager;
		let previousBasePath: string;
		let decorate: sinon.SinonStub;

		function editorFor(fsPath: string): vscode.TextEditor {
			return { document: { fileName: fsPath, uri: { fsPath } } } as unknown as vscode.TextEditor;
		}

		beforeEach(() => {
			previousBasePath = PathHelper.basePath;
			PathHelper.basePath = '/workspace';
			taskManager = TaskManager.instance;
			(Helper as any)._taskManager = taskManager;
			taskManager.useActiveTask('refresh-other').toggle('/workspace/src/b.ts', 7, '');
			const active = taskManager.useActiveTask('refresh-active');
			active.toggle('/workspace/src/a.ts', 3, '');
			active.toggle('/workspace/src/a.ts', 9, '');
			decorate = sinon.stub(DecoratorHelper, 'refresh');
		});

		afterEach(() => {
			sinon.restore();
			taskManager.delete('refresh-active');
			taskManager.delete('refresh-other');
			PathHelper.basePath = previousBasePath;
		});

		it('should show the marks in every visible editor, not only in the active one', () => {
			const left = editorFor('/workspace/src/a.ts');
			const right = editorFor('/workspace/src/a.ts');
			sinon.stub(vscode.window, 'visibleTextEditors').get(() => [left, right]);

			Helper.refresh();

			expect(decorate.calledTwice).to.be.true;
			expect(decorate.calledWithExactly(left, [3, 9])).to.be.true;
			expect(decorate.calledWithExactly(right, [3, 9])).to.be.true;
		});

		it('should clear an editor whose file has no marks in the active task', () => {
			const withMarks = editorFor('/workspace/src/a.ts');
			const marksOnlyInOtherTask = editorFor('/workspace/src/b.ts');
			sinon.stub(vscode.window, 'visibleTextEditors').get(() => [withMarks, marksOnlyInOtherTask]);

			Helper.refresh();

			expect(decorate.calledWithExactly(withMarks, [3, 9])).to.be.true;
			expect(decorate.calledWithExactly(marksOnlyInOtherTask, [])).to.be.true;
		});

		it('should show the name of the active task in the status bar', () => {
			const statusBarItem = { text: '', show: sinon.fake() };
			(Helper as any)._statusBarItem = statusBarItem;
			sinon.stub(vscode.window, 'visibleTextEditors').get(() => []);

			Helper.refresh();
			(Helper as any)._statusBarItem = undefined;

			expect(statusBarItem.text).to.equal('TaskMarks: refresh-active');
			expect(statusBarItem.show.calledOnce).to.be.true;
		});

		it('should do nothing without a visible editor', () => {
			sinon.stub(vscode.window, 'visibleTextEditors').get(() => []);
			Helper.refresh();
			expect(decorate.called).to.be.false;
		});
	});
});
