import * as vscode from 'vscode';

import { PathHelper } from './PathHelper';
import { createMarkRemoval, findUndoneRemoval, mapMarkLines, type MarkRemoval, type RemovedMark, type TextChange } from './core/lineAdjustment';
import type { Mark } from './Mark';
import type { Task } from './Task';

// Keeps the marks on their lines while documents are edited, and brings back marks that an undone edit had removed.
export abstract class MarkTracker {
	private static readonly maxRemembered = 20;
	// the marks removed by edits, for undo: per task and file path (the File itself leaves the task with its last mark)
	private static _markRemovals = new Map<Task, Map<string, MarkRemoval[]>>();

	// Moves and removes the marks of the changed document - in every task, and whether or not the document is in the active editor:
	// VS Code reports the changes of every open document (typing, rename and replace in files, format on save, a reload from disk).
	// A file that is changed while it is not open in VS Code is not reported; its marks keep their line numbers.
	// true if marks were moved, removed or (on undo) restored - the caller has to refresh the editors and to save.
	static documentChanged(event: vscode.TextDocumentChangeEvent, tasks: Task[]): boolean {
		if (event.contentChanges.length === 0 || event.document.uri.scheme !== 'file') {
			return false;
		}
		const filepath = PathHelper.reducePath(event.document.uri.fsPath);
		const isUndo = event.reason === vscode.TextDocumentChangeReason.Undo;
		const changes: TextChange[] = event.contentChanges.map((c) => ({
			startLine: c.range.start.line,
			startCharacter: c.range.start.character,
			endLine: c.range.end.line,
			endCharacter: c.range.end.character,
			text: c.text,
		}));

		let changed = false;
		for (const task of tasks) {
			changed = MarkTracker.adjustMarks(task, filepath, changes, event.document.lineCount, isUndo) || changed;
		}
		return changed;
	}

	// call when the tasks were replaced by new objects: the remembered removals belong to the old ones
	static forgetRemovals(): void {
		this._markRemovals.clear();
	}

	// true if marks of the task were moved, removed or (on undo) restored
	private static adjustMarks(task: Task, filepath: string, changes: TextChange[], lineCount: number, isUndo: boolean): boolean {
		const removals = this._markRemovals.get(task)?.get(filepath) ?? [];
		const file = task.getFile(filepath);
		if (!file && !(isUndo && removals.length > 0)) {
			return false;
		}

		const marks = file ? [...file.marks] : [];
		const newLines = mapMarkLines(
			marks.map((mark) => mark.lineNumber),
			changes,
			lineCount
		);

		let changed = false;
		const marksToRemove: Mark[] = [];
		marks.forEach((mark, index) => {
			const newLine = newLines[index];
			if (newLine === undefined) {
				marksToRemove.push(mark);
				changed = true;
			} else if (newLine !== mark.lineNumber) {
				mark.lineNumber = newLine;
				changed = true;
			}
		});

		if (marksToRemove.length > 0 && !isUndo && changes.length === 1) {
			removals.push(createMarkRemoval(changes[0], marksToRemove));
			if (removals.length > MarkTracker.maxRemembered) {
				removals.shift();
			}
			const removalsOfTask = this._markRemovals.get(task) ?? new Map<string, MarkRemoval[]>();
			removalsOfTask.set(filepath, removals);
			this._markRemovals.set(task, removalsOfTask);
		}

		const restored: RemovedMark[] = [];
		if (isUndo) {
			const index = findUndoneRemoval(removals, changes);
			if (index > -1) {
				restored.push(...removals.splice(index, 1)[0].marks.filter((mark) => mark.lineNumber < lineCount));
			}
		}

		if (!changed && restored.length === 0) {
			return false;
		}

		// a file that lost its last mark is no longer part of the task, but may get marks back by undo
		const fileToChange = file ?? task.getOrCreateFile(filepath);
		fileToChange.removeMarks(marksToRemove);
		restored.forEach((mark) => fileToChange.addMark(mark));
		task.syncFile(fileToChange);
		return true;
	}
}
