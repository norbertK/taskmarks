import * as vscode from 'vscode';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { MarkTracker } from '../../MarkTracker';
import { PathHelper } from '../../PathHelper';
import { Task } from '../../Task';
import { TaskManager } from '../../TaskManager';

describe('MarkTracker', () => {
	describe('documentChanged', () => {
		const changed = (changeEvent: vscode.TextDocumentChangeEvent) => MarkTracker.documentChanged(changeEvent, taskManager.allTasks);
		const fileA = '/workspace/src/a.ts';
		let taskManager: TaskManager;
		let active: Task;
		let other: Task;
		let previousBasePath: string;

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
			MarkTracker.forgetRemovals();
			other = taskManager.useActiveTask('doc-other');
			active = taskManager.useActiveTask('doc-active');
		});

		afterEach(() => {
			MarkTracker.forgetRemovals();
			taskManager.delete('doc-active');
			taskManager.delete('doc-other');
			PathHelper.basePath = previousBasePath;
		});

		it('should move the marks of the document in every task, not only in the active one', () => {
			active.toggle(fileA, 3, '');
			active.toggle(fileA, 10, '');
			other.toggle(fileA, 3, 'in the other task');

			changed(event(fileA, 101, [change(0, 0, 'a new first line\n')]));

			expect(active.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([4, 11]);
			expect(other.getFile('/src/a.ts')?.allPersistMarks).to.deep.equal([{ lineNumber: 4, label: 'in the other task' }]);
		});

		it('should move the marks of a document that is not in the active editor', () => {
			active.toggle(fileA, 3, '');
			active.use('/workspace/src/b.ts');

			changed(event(fileA, 101, [change(0, 0, 'a new first line\n')]));

			expect(active.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([4]);
		});

		it('should say that marks have changed when they have moved', () => {
			active.toggle(fileA, 3, '');
			other.toggle(fileA, 3, '');

			expect(changed(event(fileA, 101, [change(0, 0, 'a new first line\n')]))).to.be.true;
		});

		it('should say that nothing has changed for a document without marks or a change below the marks', () => {
			active.toggle(fileA, 3, '');

			expect(changed(event('/workspace/src/b.ts', 101, [change(0, 0, 'a new first line\n')]))).to.be.false;
			expect(changed(event(fileA, 101, [change(50, 50, 'a new line far below\n')]))).to.be.false;

			expect(active.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([3]);
		});

		it('should say that marks have changed when they were removed and when they were brought back', () => {
			active.toggle(fileA, 3, '');

			expect(changed(deleteLines())).to.be.true;
			expect(changed(undoDeleteLines())).to.be.true;
		});

		it('should ignore documents that are not files', () => {
			active.toggle(fileA, 3, '');
			changed(event(fileA, 101, [change(0, 0, 'a new first line\n')], { scheme: 'git' }));
			expect(active.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([3]);
		});

		it('should remove the marks on deleted lines in every task and take a file without marks out of its task', () => {
			active.toggle(fileA, 3, '');
			active.toggle(fileA, 10, '');
			other.toggle(fileA, 3, '');

			changed(deleteLines());

			expect(active.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([7]);
			expect(other.files.length).to.equal(0);
		});

		it('should bring the marks back in every task when the deletion is undone, also into a task that had lost the file', () => {
			active.toggle(fileA, 3, 'mine');
			active.toggle(fileA, 10, '');
			other.toggle(fileA, 3, 'in the other task');
			changed(deleteLines());

			changed(undoDeleteLines());

			expect(active.getFile('/src/a.ts')?.allPersistMarks).to.deep.equal([
				{ lineNumber: 3, label: 'mine' },
				{ lineNumber: 10, label: '' },
			]);
			expect(other.getFile('/src/a.ts')?.allPersistMarks).to.deep.equal([{ lineNumber: 3, label: 'in the other task' }]);
		});

		it('should bring a mark back only in the task that had it', () => {
			active.toggle(fileA, 10, '');
			other.toggle(fileA, 3, '');
			changed(deleteLines());

			changed(undoDeleteLines());

			expect(active.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([10]);
			expect(other.getFile('/src/a.ts')?.lineNumbers).to.deep.equal([3]);
		});

		it('should keep the same file object for the active file when its marks come back', () => {
			const activeFile = active.use(fileA);
			active.toggle(fileA, 3, '');
			changed(deleteLines());
			expect(active.files.length).to.equal(0);

			changed(undoDeleteLines());

			expect(active.files).to.deep.equal([activeFile]);
		});
	});
});
