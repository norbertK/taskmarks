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

	describe('reportError', () => {
		let previousOutputChannel: unknown;

		beforeEach(() => {
			previousOutputChannel = (Helper as any)._outputChannel;
		});

		afterEach(() => {
			sinon.restore();
			(Helper as any)._outputChannel = previousOutputChannel;
		});

		it('should write message and stack to the output channel and show it without taking the focus', () => {
			const outputChannel = { appendLine: sinon.fake(), show: sinon.fake() };
			(Helper as any)._outputChannel = outputChannel;

			Helper.reportError({ message: 'it broke', stack: 'at somewhere' });

			expect(outputChannel.appendLine.args).to.deep.equal([['it broke'], ['at somewhere']]);
			expect(outputChannel.show.calledOnceWithExactly(true)).to.be.true;
		});

		it('should write only the message if there is no stack', () => {
			const outputChannel = { appendLine: sinon.fake(), show: sinon.fake() };
			(Helper as any)._outputChannel = outputChannel;

			Helper.reportError({ message: 'it broke' });

			expect(outputChannel.appendLine.args).to.deep.equal([['it broke']]);
		});

		// the message then goes to the console, which can't be replaced in a real VS Code
		it('should not fail while there is no output channel', () => {
			(Helper as any)._outputChannel = undefined;
			expect(() => Helper.reportError({ message: 'reportError without an output channel (expected in this test)' })).to.not.throw();
		});
	});

	// init connects everything: the handlers are tested above, here that they are called by the events of VS Code
	describe('init', () => {
		type Listener = (...args: unknown[]) => unknown;
		const outputChannel = {} as vscode.OutputChannel;
		const dataFile = '/workspace/.vscode/taskmarks.json';
		let context: vscode.ExtensionContext;
		let subscriptions: unknown[];
		let listeners: Record<string, Listener>;
		let statusBarItem: { text: string; show: sinon.SinonSpy; dispose: sinon.SinonSpy };
		let watcher: { onDidChange: sinon.SinonSpy; onDidCreate: sinon.SinonSpy; dispose: sinon.SinonSpy };
		let createFileSystemWatcher: sinon.SinonSpy;
		let initAndLoad: sinon.SinonStub;
		let initDecorator: sinon.SinonStub;
		let workspaceFolders: unknown;
		let previous: { taskManager: unknown; outputChannel: unknown; statusBarItem: unknown; basePath: string; dataFile: unknown };

		// stands in for an event of VS Code: remembers the listener, registers a disposable like the real one
		function eventNamed(name: string) {
			return sinon.fake((listener: Listener, _thisArg: unknown, disposables: unknown[]) => {
				listeners[name] = listener;
				const disposable = { dispose: sinon.fake() };
				disposables.push(disposable);
				return disposable;
			});
		}

		beforeEach(() => {
			previous = {
				taskManager: (Helper as any)._taskManager,
				outputChannel: (Helper as any)._outputChannel,
				statusBarItem: (Helper as any)._statusBarItem,
				basePath: PathHelper.basePath,
				dataFile: (PathHelper as any)._taskmarksDataFilePath,
			};
			(PathHelper as any)._taskmarksDataFilePath = dataFile;

			subscriptions = [];
			context = { subscriptions } as unknown as vscode.ExtensionContext;
			listeners = {};
			workspaceFolders = [{ uri: { fsPath: '/workspace' } }];
			sinon.stub(vscode.workspace, 'workspaceFolders').get(() => workspaceFolders);
			sinon.stub(vscode.window, 'activeTextEditor').get(() => undefined);
			sinon.stub(vscode.window, 'visibleTextEditors').get(() => []);

			initAndLoad = sinon.stub(Persist, 'initAndLoad');
			initDecorator = sinon.stub(DecoratorHelper, 'initDecorator');
			statusBarItem = { text: '', show: sinon.fake(), dispose: sinon.fake() };
			sinon.replace(vscode.window, 'createStatusBarItem', sinon.fake.returns(statusBarItem) as any);
			sinon.replace(vscode.window, 'onDidChangeActiveTextEditor', eventNamed('activeEditor') as any);
			sinon.replace(vscode.window, 'onDidChangeVisibleTextEditors', eventNamed('visibleEditors') as any);
			sinon.replace(vscode.workspace, 'onDidSaveTextDocument', eventNamed('documentSaved') as any);
			sinon.replace(vscode.workspace, 'onDidChangeTextDocument', eventNamed('documentChanged') as any);
			watcher = { onDidChange: sinon.fake(), onDidCreate: sinon.fake(), dispose: sinon.fake() };
			createFileSystemWatcher = sinon.fake.returns(watcher);
			sinon.replace(vscode.workspace, 'createFileSystemWatcher', createFileSystemWatcher as any);
		});

		afterEach(() => {
			sinon.restore();
			(Helper as any)._taskManager = previous.taskManager;
			(Helper as any)._outputChannel = previous.outputChannel;
			(Helper as any)._statusBarItem = previous.statusBarItem;
			PathHelper.basePath = previous.basePath;
			(PathHelper as any)._taskmarksDataFilePath = previous.dataFile;
		});

		it('should load the tasks of the first workspace folder', () => {
			Helper.init(context, outputChannel);

			expect(PathHelper.basePath).to.equal('/workspace');
			expect(Helper.taskManager).to.equal(TaskManager.instance);
			expect(initAndLoad.calledOnceWithExactly(TaskManager.instance, context)).to.be.true;
			expect(initDecorator.calledOnceWithExactly(context)).to.be.true;
			expect(Helper.outputChannel).to.equal(outputChannel);
		});

		it('should show the active task in the status bar right away', () => {
			Helper.init(context, outputChannel);
			expect(statusBarItem.text).to.equal('TaskMarks: ' + TaskManager.instance.activeTask.name);
			expect(statusBarItem.show.called).to.be.true;
		});

		it('should register everything it creates for disposal with the extension', () => {
			Helper.init(context, outputChannel);

			expect(subscriptions).to.include(statusBarItem);
			expect(subscriptions).to.include(watcher);
			// the status bar item, the watcher and the four event listeners
			expect(subscriptions.length).to.equal(6);
			expect(Object.keys(listeners).sort()).to.deep.equal(['activeEditor', 'documentChanged', 'documentSaved', 'visibleEditors']);
		});

		it('should use the file of an editor that becomes the active one', () => {
			Helper.init(context, outputChannel);
			const changeActiveFile = sinon.stub(Helper, 'changeActiveFile');
			const editor = {} as vscode.TextEditor;

			listeners.activeEditor(editor);

			expect(changeActiveFile.calledOnceWithExactly(editor)).to.be.true;
		});

		it('should show the marks when other editors become visible', () => {
			Helper.init(context, outputChannel);
			const refresh = sinon.stub(Helper, 'refresh');

			listeners.visibleEditors([]);

			expect(refresh.calledOnce).to.be.true;
		});

		it('should save when a document is saved', () => {
			Helper.init(context, outputChannel);
			const saveTaskmarksJson = sinon.stub(Persist, 'saveTaskmarksJson');

			listeners.documentSaved({});

			expect(saveTaskmarksJson.calledOnce).to.be.true;
		});

		it('should track the marks when a document changes', () => {
			Helper.init(context, outputChannel);
			const documentChanged = sinon.stub(Helper, 'documentChanged');
			const event = {} as vscode.TextDocumentChangeEvent;

			listeners.documentChanged(event);

			expect(documentChanged.calledOnceWithExactly(event)).to.be.true;
		});

		it('should watch taskmarks.json, from the folder above its own (which may not exist yet)', () => {
			Helper.init(context, outputChannel);

			expect(createFileSystemWatcher.calledOnce).to.be.true;
			const relativePattern = createFileSystemWatcher.firstCall.args[0];
			// a real RelativePattern has the pattern, the mock only records the arguments of its constructor
			const pattern = relativePattern.pattern ?? (vscode.RelativePattern as any).lastCall.args[1];
			expect(pattern).to.equal('.vscode/taskmarks.json');
			expect(watcher.onDidChange.calledOnce).to.be.true;
			expect(watcher.onDidCreate.calledOnce).to.be.true;
		});

		it('should reload once, 300 ms after the last of several changes of taskmarks.json', () => {
			const clock = sinon.useFakeTimers();
			Helper.init(context, outputChannel);
			const taskmarksFileChanged = sinon.stub(Helper, 'taskmarksFileChanged');
			const changed = watcher.onDidChange.firstCall.args[0] as () => void;
			const created = watcher.onDidCreate.firstCall.args[0] as () => void;

			created();
			clock.tick(200);
			changed();
			clock.tick(299);
			expect(taskmarksFileChanged.called).to.be.false;

			clock.tick(1);
			expect(taskmarksFileChanged.calledOnce).to.be.true;
		});

		it('should report the error and fail without a workspace folder', () => {
			workspaceFolders = undefined;
			const reportError = sinon.stub(Helper, 'reportError');

			expect(() => Helper.init(context, outputChannel)).to.throw('Could not find a workspace');

			expect(reportError.calledOnce).to.be.true;
			expect(reportError.firstCall.args[0].message).to.equal('Could not find a workspace');
			expect(initAndLoad.called).to.be.false;
		});
	});
});
