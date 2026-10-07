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

		it('should leave out a file that does not exist, without reporting an error', async () => {
			task.toggle('/workspace/src/only-on-another-branch.ts', 0, '');
			task.toggle('/workspace/src/b.ts', 1, '');
			missingFiles = ['/src/only-on-another-branch.ts'];

			const items = await Helper.getMarkQuickPickItems(task);

			expect(items.map((item) => item.label)).to.deep.equal(['one', 'second']);
			expect(reportError.called).to.be.false;
			expect(openTextDocument.callCount).to.equal(2);
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
			sinon.stub(PathHelper, 'fileExists').returns(true);
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
			(Helper as any)._markRemovals.set(
				taskManager.activeTask,
				new Map([['/src/a.ts', [{ startLine: 1, startCharacter: 0, replacedLines: 1, insertedLines: 0, marks: [] }]]])
			);
			refresh = sinon.stub(DecoratorHelper, 'refresh');
			reportError = sinon.stub(Helper, 'reportError');
		});

		afterEach(() => {
			sinon.restore();
			(Helper as any)._markRemovals.clear();
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
			expect((Helper as any)._markRemovals.size).to.equal(0);
		});

		it('should do nothing when the tasks were not reloaded', async () => {
			sinon.stub(Persist, 'reloadIfChangedOnDisk').resolves(false);

			await Helper.taskmarksFileChanged();

			expect(refresh.called).to.be.false;
			expect((Helper as any)._markRemovals.size).to.equal(1);
		});

		it('should report an error instead of throwing', async () => {
			sinon.stub(Persist, 'reloadIfChangedOnDisk').rejects(new Error('disk is gone'));
			await Helper.taskmarksFileChanged();
			expect(reportError.calledOnceWithExactly({ message: 'disk is gone' })).to.be.true;
		});
	});

	describe('documentChanged', () => {
		const fileA = '/workspace/src/a.ts';
		let taskManager: TaskManager;
		let active: Task;
		let other: Task;
		let previousBasePath: string;
		let saveTaskmarksJson: sinon.SinonStub;
		let refresh: sinon.SinonStub;

		function change(startLine: number, endLine: number, text: string) {
			return { range: { start: { line: startLine, character: 0 }, end: { line: endLine, character: 0 } }, text };
		}

		function event(fsPath: string, lineCount: number, changes: ReturnType<typeof change>[], options: { undo?: boolean; scheme?: string } = {}) {
			return {
				document: { uri: { fsPath, scheme: options.scheme ?? 'file' }, lineCount },
				contentChanges: changes,
				reason: options.undo ? vscode.TextDocumentChangeReason.Undo : undefined,
			} as unknown as vscode.TextDocumentChangeEvent;
		}

		// lines 2, 3 and 4 of a file with 100 lines are deleted, and the deletion is undone
		const deleteLines = () => event(fileA, 97, [change(2, 5, '')]);
		const undoDeleteLines = () => event(fileA, 100, [change(2, 2, 'two\nthree\nfour\n')], { undo: true });

		beforeEach(() => {
			previousBasePath = PathHelper.basePath;
			PathHelper.basePath = '/workspace';
			taskManager = TaskManager.instance;
			(Helper as any)._taskManager = taskManager;
			(Helper as any)._markRemovals.clear();
			other = taskManager.useActiveTask('doc-other');
			active = taskManager.useActiveTask('doc-active');
			saveTaskmarksJson = sinon.stub(Persist, 'saveTaskmarksJson');
			refresh = sinon.stub(Helper, 'refresh');
		});

		afterEach(() => {
			sinon.restore();
			(Helper as any)._markRemovals.clear();
			taskManager.delete('doc-active');
			taskManager.delete('doc-other');
			PathHelper.basePath = previousBasePath;
		});

		it('should move the marks of the document in every task, not only in the active one', () => {
			active.toggle(fileA, 3, '');
			active.toggle(fileA, 10, '');
			other.toggle(fileA, 3, 'in the other task');

			Helper.documentChanged(event(fileA, 101, [change(0, 0, 'a new first line\n')]));

			expect(active.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([4, 11]);
			expect(other.getFile('/src/a.ts')?.allPersistMarks).to.deep.equal([{ lineNumber: 4, label: 'in the other task' }]);
		});

		it('should move the marks of a document that is not in the active editor', () => {
			active.toggle(fileA, 3, '');
			active.use('/workspace/src/b.ts');

			Helper.documentChanged(event(fileA, 101, [change(0, 0, 'a new first line\n')]));

			expect(active.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([4]);
		});

		it('should refresh the editors and save once when marks have moved', () => {
			active.toggle(fileA, 3, '');
			other.toggle(fileA, 3, '');

			Helper.documentChanged(event(fileA, 101, [change(0, 0, 'a new first line\n')]));

			expect(refresh.calledOnce).to.be.true;
			expect(saveTaskmarksJson.calledOnce).to.be.true;
		});

		it('should neither refresh nor save for a document without marks or a change below the marks', () => {
			active.toggle(fileA, 3, '');

			Helper.documentChanged(event('/workspace/src/b.ts', 101, [change(0, 0, 'a new first line\n')]));
			Helper.documentChanged(event(fileA, 101, [change(50, 50, 'a new line far below\n')]));

			expect(active.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([3]);
			expect(refresh.called).to.be.false;
			expect(saveTaskmarksJson.called).to.be.false;
		});

		it('should ignore documents that are not files', () => {
			active.toggle(fileA, 3, '');
			Helper.documentChanged(event(fileA, 101, [change(0, 0, 'a new first line\n')], { scheme: 'git' }));
			expect(active.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([3]);
		});

		it('should remove the marks on deleted lines in every task and take a file without marks out of its task', () => {
			active.toggle(fileA, 3, '');
			active.toggle(fileA, 10, '');
			other.toggle(fileA, 3, '');

			Helper.documentChanged(deleteLines());

			expect(active.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([7]);
			expect(other.files.length).to.equal(0);
		});

		it('should bring the marks back in every task when the deletion is undone, also into a task that had lost the file', () => {
			active.toggle(fileA, 3, 'mine');
			active.toggle(fileA, 10, '');
			other.toggle(fileA, 3, 'in the other task');
			Helper.documentChanged(deleteLines());

			Helper.documentChanged(undoDeleteLines());

			expect(active.getFile('/src/a.ts')?.allPersistMarks).to.deep.equal([
				{ lineNumber: 3, label: 'mine' },
				{ lineNumber: 10, label: '' },
			]);
			expect(other.getFile('/src/a.ts')?.allPersistMarks).to.deep.equal([{ lineNumber: 3, label: 'in the other task' }]);
		});

		it('should bring a mark back only in the task that had it', () => {
			active.toggle(fileA, 10, '');
			other.toggle(fileA, 3, '');
			Helper.documentChanged(deleteLines());

			Helper.documentChanged(undoDeleteLines());

			expect(active.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([10]);
			expect(other.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([3]);
		});

		it('should keep the same file object for the active file when its marks come back', () => {
			const activeFile = active.use(fileA);
			active.toggle(fileA, 3, '');
			Helper.documentChanged(deleteLines());
			expect(active.files.length).to.equal(0);

			Helper.documentChanged(undoDeleteLines());

			expect(active.files).to.deep.equal([activeFile]);
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

		it('should do nothing without a visible editor', () => {
			sinon.stub(vscode.window, 'visibleTextEditors').get(() => []);
			Helper.refresh();
			expect(decorate.called).to.be.false;
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
			showQuickPick = sinon.fake(() => Promise.resolve(picked));
			sinon.replace(vscode.window, 'showQuickPick', showQuickPick as any);
			sinon.replace(vscode.window, 'showInputBox', sinon.fake(() => Promise.resolve(typed)) as any);
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
			it('should offer the active task first', async () => {
				await Helper.selectTask();
				expect(showQuickPick.firstCall.args[0][0]).to.equal('cmd-a');
				expect(showQuickPick.firstCall.args[0]).to.include('cmd-b');
			});

			it('should make the picked task the active one, show its marks and save', async () => {
				picked = 'cmd-b';
				await Helper.selectTask();
				expect(taskManager.activeTask.name).to.equal('cmd-b');
				expect(refresh.calledOnce).to.be.true;
				expect(saveTaskmarksJson.calledOnce).to.be.true;
			});

			it('should do nothing when the list is dismissed', async () => {
				await Helper.selectTask();
				expect(taskManager.activeTask.name).to.equal('cmd-a');
				expect(refresh.called).to.be.false;
				expect(saveTaskmarksJson.called).to.be.false;
			});

			it('should report an error instead of throwing', async () => {
				sinon.restore();
				reportError = sinon.stub(Helper, 'reportError');
				sinon.replace(vscode.window, 'showQuickPick', sinon.fake.rejects(new Error('no list')) as any);
				await Helper.selectTask();
				expect(reportError.calledOnceWithExactly({ message: 'no list' })).to.be.true;
			});
		});

		describe('createTask', () => {
			it('should create the task, make it the active one and save', async () => {
				typed = 'cmd-new';
				await Helper.createTask();
				expect(taskManager.activeTask.name).to.equal('cmd-new');
				expect(taskManager.taskNames).to.include('cmd-new');
				expect(saveTaskmarksJson.calledOnce).to.be.true;
			});

			it('should do nothing when the input is cancelled or empty', async () => {
				await Helper.createTask();
				typed = '';
				await Helper.createTask();
				expect(taskManager.activeTask.name).to.equal('cmd-a');
				expect(saveTaskmarksJson.called).to.be.false;
			});
		});

		describe('deleteTask', () => {
			it('should delete a task without bookmarks without asking', async () => {
				picked = 'cmd-b';
				await Helper.deleteTask();
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

				await Helper.deleteTask();

				expect(showWarningMessage.calledOnceWithExactly("Delete task 'cmd-b' with its 3 bookmarks?", { modal: true }, 'Delete')).to.be.true;
			});

			it('should keep the task when the question is not answered with Delete', async () => {
				taskManager.allTasks.find((task) => task.name === 'cmd-b')!.toggle('/workspace/src/a.ts', 1, '');
				picked = 'cmd-b';

				await Helper.deleteTask();

				expect(showWarningMessage.calledOnceWithExactly("Delete task 'cmd-b' with its bookmark?", { modal: true }, 'Delete')).to.be.true;
				expect(taskManager.taskNames).to.include('cmd-b');
				expect(saveTaskmarksJson.called).to.be.false;
			});

			it('should delete the task when the question is answered with Delete', async () => {
				taskManager.allTasks.find((task) => task.name === 'cmd-b')!.toggle('/workspace/src/a.ts', 1, '');
				picked = 'cmd-b';
				clicked = 'Delete';

				await Helper.deleteTask();

				expect(taskManager.taskNames).to.not.include('cmd-b');
				expect(saveTaskmarksJson.calledOnce).to.be.true;
			});

			it('should switch to the default task when the active task is deleted', async () => {
				picked = 'cmd-a';
				await Helper.deleteTask();
				expect(taskManager.activeTask.name).to.equal('default');
				expect(refresh.calledOnce).to.be.true;
			});

			it('should do nothing when the list is dismissed', async () => {
				await Helper.deleteTask();
				expect(taskManager.taskNames).to.include.members(['cmd-a', 'cmd-b']);
				expect(saveTaskmarksJson.called).to.be.false;
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
			await Helper.pasteFromClipboard();
			expect(refresh.calledOnce).to.be.true;
			expect(saveTaskmarksJson.calledOnce).to.be.true;
			expect(refresh.calledAfter(paste)).to.be.true;
		});

		it('should neither refresh nor save when nothing was pasted', async () => {
			sinon.stub(Persist, 'pasteFromClipboard').resolves(false);
			await Helper.pasteFromClipboard();
			expect(refresh.called).to.be.false;
			expect(saveTaskmarksJson.called).to.be.false;
		});

		it('should report a file that could not be saved instead of throwing', async () => {
			sinon.stub(Persist, 'pasteFromClipboard').resolves(true);
			saveTaskmarksJson.throws(new Error('file is locked'));
			await Helper.pasteFromClipboard();
			expect(reportError.calledOnceWithExactly({ message: 'taskmarks.json could not be saved: file is locked' })).to.be.true;
		});

		it('should report a clipboard that could not be read', async () => {
			sinon.stub(Persist, 'pasteFromClipboard').rejects(new Error('no clipboard'));
			await Helper.pasteFromClipboard();
			expect(reportError.calledOnceWithExactly({ message: 'no clipboard' })).to.be.true;
		});
	});

	describe('renameTask', () => {
		let taskManager: TaskManager;
		let saveTaskmarksJson: sinon.SinonStub;
		let showInformationMessage: sinon.SinonSpy;
		let namesWhenSaved: string[];

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
			showInformationMessage = sinon.fake();
			sinon.replace(vscode.window, 'showInformationMessage', showInformationMessage as any);
		});

		afterEach(() => {
			sinon.restore();
			['helper-rename-a', 'helper-rename-b', 'helper-rename-c'].forEach((name) => taskManager.delete(name));
		});

		it('should rename the picked task and save after the rename', async () => {
			answer('helper-rename-b', 'helper-rename-c');
			await Helper.renameTask();
			await answered();
			expect(taskManager.taskNames).to.include('helper-rename-c');
			expect(taskManager.taskNames).to.not.include('helper-rename-b');
			expect(saveTaskmarksJson.calledOnce).to.be.true;
			expect(namesWhenSaved).to.include('helper-rename-c');
		});

		it('should refuse a name that another task already has and say so', async () => {
			answer('helper-rename-b', 'helper-rename-a');
			await Helper.renameTask();
			await answered();
			expect(taskManager.taskNames.filter((name) => name === 'helper-rename-a').length).to.equal(1);
			expect(taskManager.taskNames).to.include('helper-rename-b');
			expect(showInformationMessage.calledOnceWithExactly("Taskmarks: there is already a task named 'helper-rename-a'.")).to.be.true;
			expect(saveTaskmarksJson.called).to.be.false;
		});

		it('should do nothing when the name input is cancelled', async () => {
			answer('helper-rename-b', undefined);
			await Helper.renameTask();
			await answered();
			expect(taskManager.taskNames).to.include('helper-rename-b');
			expect(saveTaskmarksJson.called).to.be.false;
		});

		it('should do nothing when no task is picked', async () => {
			answer(undefined, 'helper-rename-c');
			await Helper.renameTask();
			await answered();
			expect(taskManager.taskNames).to.not.include('helper-rename-c');
			expect(saveTaskmarksJson.called).to.be.false;
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
			sinon.replace(vscode.workspace, 'getConfiguration', sinon.fake.returns({ get: () => enableLabel }) as any);
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

		it('should set a mark without label when the label input is left empty', async () => {
			setEnableLabel(true, '');
			setActiveEditor(fakeEditor(fileInWorkspace, 4));
			await Helper.toggleMark();
			await inputBoxAnswered();
			expect(task.getFile(reducedPath)?.allPersistMarks).to.deep.equal([{ lineNumber: 4, label: '' }]);
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
