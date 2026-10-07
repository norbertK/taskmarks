import * as vscode from 'vscode';
import { basename, dirname } from 'path';

import { TaskManager } from './TaskManager';
import { Persist } from './Persist';
import { DecoratorHelper } from './DecoratorHelper';
import { PathHelper } from './PathHelper';
import { createMarkRemoval, findUndoneRemoval, mapMarkLines, type MarkRemoval, type RemovedMark, type TextChange } from './core/lineAdjustment';
import type { Mark } from './Mark';
import type { Task } from './Task';

export abstract class Helper {
	private static readonly maxRemembered = 20;
	// the marks removed by edits, for undo: per task and file path (the File itself leaves the task with its last mark)
	private static _markRemovals = new Map<Task, Map<string, MarkRemoval[]>>();
	private static _taskManager: TaskManager;
	private static _outputChannel: vscode.OutputChannel;

	static reportError = ({ message, stack }: { message: string; stack?: string }) => {
		if (Helper.outputChannel) {
			Helper.outputChannel.appendLine(message);
			if (stack) {
				Helper.outputChannel.appendLine(stack);
			}
			Helper.outputChannel.show(true);
		} else {
			console.log(message);
		}
	};

	static get outputChannel(): vscode.OutputChannel {
		return this._outputChannel;
	}

	static init(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel): void {
		try {
			Helper._outputChannel = outputChannel;

			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders) {
				throw new Error('Could not find a workspace');
			}
			const workspaceFolder: vscode.WorkspaceFolder = workspaceFolders[0];
			const uri: vscode.Uri = workspaceFolder.uri;
			PathHelper.basePath = uri.fsPath;

			this._taskManager = TaskManager.instance;
			Persist.initAndLoad(this._taskManager, context);

			DecoratorHelper.initDecorator(context);

			Helper.initEditorChangeHandlers(context);
			Helper.initSaveHandler(context);
			Helper.initChangeHandler(context);
			Helper.initTaskmarksFileWatcher(context);
		} catch (error: unknown) {
			const message = Helper.getErrorMessage(error);
			const stack = Helper.getErrorStack(error);
			Helper.reportError({ message, stack });
			throw error;
		}
	}

	// call when the active task or its files are other objects than before (task selected, created, deleted, tasks reloaded)
	private static triggerChangeActiveFile(): void {
		this.changeActiveFile(vscode.window.activeTextEditor);
	}

	private static initEditorChangeHandlers(context: vscode.ExtensionContext): void {
		this.changeActiveFile(vscode.window.activeTextEditor);
		vscode.window.onDidChangeActiveTextEditor((editor) => this.changeActiveFile(editor), null, context.subscriptions);
		// an editor that becomes visible without becoming the active one (split view) needs its marks as well
		vscode.window.onDidChangeVisibleTextEditors(() => this.refresh(), null, context.subscriptions);
	}

	// taskmarks.json is shared in a team: it changes with a pull, a checkout or an edit by hand
	private static initTaskmarksFileWatcher(context: vscode.ExtensionContext): void {
		const file = PathHelper.taskmarksDataFilePath;
		const folder = dirname(file);
		// the base of the pattern has to exist, the folder of the file (.vscode) may not yet
		const pattern = new vscode.RelativePattern(vscode.Uri.file(dirname(folder)), `${basename(folder)}/${basename(file)}`);
		const watcher = vscode.workspace.createFileSystemWatcher(pattern);
		let timer: NodeJS.Timeout | undefined;
		// wait until the file is written completely, git and editors may write in several steps
		const changed = () => {
			clearTimeout(timer);
			timer = setTimeout(() => Helper.taskmarksFileChanged(), 300);
		};
		watcher.onDidChange(changed);
		watcher.onDidCreate(changed);
		context.subscriptions.push(watcher);
	}

	static async taskmarksFileChanged(): Promise<void> {
		try {
			if (await Persist.reloadIfChangedOnDisk()) {
				// the tasks and their files are new objects: forget the removed marks of the old ones, use the active file again
				this._markRemovals.clear();
				Helper.triggerChangeActiveFile();
			}
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	private static initSaveHandler(context: vscode.ExtensionContext): void {
		// every change of the marks is saved at once - this is for what is still open then: the upgrade of an old file, a write that failed
		vscode.workspace.onDidSaveTextDocument(() => Helper.save(), null, context.subscriptions);
	}

	private static initChangeHandler(context: vscode.ExtensionContext): void {
		vscode.workspace.onDidChangeTextDocument((event) => Helper.documentChanged(event), null, context.subscriptions);
	}

	// Moves and removes the marks of the changed document - in every task, and whether or not the document is in the active editor:
	// VS Code reports the changes of every open document (typing, rename and replace in files, format on save, a reload from disk).
	// A file that is changed while it is not open in VS Code is not reported; its marks keep their line numbers.
	static documentChanged(event: vscode.TextDocumentChangeEvent): void {
		try {
			if (event.contentChanges.length === 0 || event.document.uri.scheme !== 'file') {
				return;
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
			for (const task of this._taskManager.allTasks) {
				changed = Helper.adjustMarks(task, filepath, changes, event.document.lineCount, isUndo) || changed;
			}
			if (changed) {
				Helper.refresh();
				Helper.save();
			}
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
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
			if (removals.length > Helper.maxRemembered) {
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

	// one entry per mark of the task: the label (or the text of the marked line, without indentation), the line number and the file
	// built from the documents on every call, as line numbers and line texts change while a file is edited
	// left out: files that don't exist, files that can't be read (reported), marks behind the last line of their file
	static async getMarkQuickPickItems(task: Task): Promise<MarkQuickPickItem[]> {
		const quickPickItems: MarkQuickPickItem[] = [];
		for (const file of task.files) {
			// not an error: taskmarks.json keeps the marks of files that don't exist here (a teammate's file, another branch)
			if (!PathHelper.fileExists(file.filepath)) {
				continue;
			}
			try {
				const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(PathHelper.getFullPath(file.filepath)));
				for (const mark of file.marks) {
					if (mark.lineNumber < doc.lineCount) {
						quickPickItems.push({
							label: mark.label || doc.lineAt(mark.lineNumber).text.trim() || '(empty line)',
							// shown as in the editor, which counts lines from 1
							description: (mark.lineNumber + 1).toString(),
							detail: file.filepath,
							filepath: file.filepath,
							mark,
						});
					}
				}
			} catch (error: unknown) {
				Helper.reportError({ message: Helper.getErrorMessage(error) });
			}
		}
		return quickPickItems;
	}

	static async selectMarkFromList(): Promise<void> {
		try {
			const options: vscode.QuickPickOptions = {
				placeHolder: 'select Bookmark',
			};

			const quickPickItems = await this.getMarkQuickPickItems(this._taskManager.activeTask);
			const result = await vscode.window.showQuickPick(quickPickItems, options);
			if (result) {
				await DecoratorHelper.openAndShow(result.filepath, result.mark.lineNumber);
			}
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	// a failed write is reported, not thrown: most callers are event handlers, and the next save tries again
	private static save(): void {
		try {
			Persist.saveTaskmarksJson();
		} catch (error: unknown) {
			Helper.reportError({ message: `taskmarks.json could not be saved: ${Helper.getErrorMessage(error)}` });
		}
	}

	static copyToClipboard(): void {
		Persist.copyToClipboard();
	}

	static async pasteFromClipboard(): Promise<void> {
		try {
			if (await Persist.pasteFromClipboard()) {
				// the pasted task may have brought marks for the files in the visible editors
				Helper.refresh();
				Helper.save();
			}
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	// the active task first: it is the one preselected in a list
	private static taskNamesActiveFirst(): string[] {
		const activeTaskName = this._taskManager.activeTask.name;
		return [activeTaskName, ...this._taskManager.taskNames.filter((taskName) => taskName !== activeTaskName)];
	}

	static async selectTask(): Promise<void> {
		try {
			const taskName = await vscode.window.showQuickPick(Helper.taskNamesActiveFirst(), { placeHolder: 'select Task ' });
			if (!taskName) {
				return;
			}
			this._taskManager.useActiveTask(taskName);
			Helper.triggerChangeActiveFile();
			Helper.save();
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	static async renameTask(): Promise<void> {
		try {
			const oldTaskName = await vscode.window.showQuickPick(Helper.taskNamesActiveFirst(), { placeHolder: 'rename Task ' });
			if (!oldTaskName) {
				return;
			}
			const newTaskName = await vscode.window.showInputBox({ prompt: `New name for task '${oldTaskName}'`, value: oldTaskName });
			if (!newTaskName) {
				return;
			}
			if (!this._taskManager.renameTask(oldTaskName, newTaskName)) {
				vscode.window.showInformationMessage(`Taskmarks: there is already a task named '${newTaskName}'.`);
				return;
			}
			Helper.save();
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	static async createTask(): Promise<void> {
		try {
			const newTaskName = await vscode.window.showInputBox({ prompt: 'Name of the new task', placeHolder: 'e.g. bugfix-login' });
			if (!newTaskName) {
				return;
			}
			this._taskManager.useActiveTask(newTaskName);
			Helper.triggerChangeActiveFile();
			Helper.save();
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	static async deleteTask(): Promise<void> {
		try {
			const taskName = await vscode.window.showQuickPick(this._taskManager.taskNames, { placeHolder: 'delete Task ' });
			if (!taskName) {
				return;
			}
			// a deleted task can't be brought back, so ask before bookmarks are lost
			const task = this._taskManager.allTasks.find((task) => task.name === taskName);
			const markCount = task ? task.files.reduce((count, file) => count + file.marks.length, 0) : 0;
			if (markCount > 0) {
				const deleteIt = 'Delete';
				const bookmarks = markCount === 1 ? 'its bookmark' : `its ${markCount} bookmarks`;
				const answer = await vscode.window.showWarningMessage(`Delete task '${taskName}' with ${bookmarks}?`, { modal: true }, deleteIt);
				if (answer !== deleteIt) {
					return;
				}
			}
			this._taskManager.delete(taskName);
			Helper.triggerChangeActiveFile();
			Helper.save();
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	static async nextMark(): Promise<void> {
		const activeTextEditor = vscode.window.activeTextEditor;
		if (!activeTextEditor) {
			return;
		}
		const line = activeTextEditor.selection.active.line;
		this._taskManager.nextMark(line);
	}

	static async previousMark(): Promise<void> {
		const activeTextEditor = vscode.window.activeTextEditor;
		if (!activeTextEditor) {
			return;
		}
		const line = activeTextEditor.selection.active.line;
		this._taskManager.previousMark(line);
	}

	static async toggleMark(): Promise<void> {
		try {
			const activeTextEditor = vscode.window.activeTextEditor;
			if (!activeTextEditor) {
				return;
			}
			const activeTask = this._taskManager.activeTask;
			const activeLine = activeTextEditor.selection.active.line;

			const fullName = activeTextEditor.document.fileName;
			if (!PathHelper.isInWorkspace(fullName)) {
				// such a path can't be stored workspace-relative, the mark would be lost with the next reload
				vscode.window.showInformationMessage('Taskmarks: bookmarks can only be set in files inside the workspace folder.');
				return;
			}

			let label = '';
			const enableLabel = vscode.workspace.getConfiguration().get<boolean>('taskmarks.enableLabel');
			if (enableLabel && !activeTask.lineHasMark(fullName, activeLine)) {
				const answer = await vscode.window.showInputBox({
					prompt: 'Label for this bookmark (shown in "Select Bookmark from List"). Leave empty for a bookmark without label.',
				});
				// Escape cancels, Enter on the empty box sets a bookmark without label
				if (answer === undefined) {
					return;
				}
				label = answer;
			}

			activeTask.toggle(fullName, activeLine, label);
			Helper.save();
			Helper.triggerChangeActiveFile();
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	// the active file is where next / previous bookmark start from
	static changeActiveFile(editor: vscode.TextEditor | undefined): void {
		if (editor) {
			this._taskManager.activeTask.use(editor.document.uri.fsPath);
		}
		this.refresh();
	}

	// shows the marks of the active task in every visible editor (split view shows several files, or one file twice)
	static refresh(): void {
		const activeTask = this._taskManager.activeTask;
		for (const editor of vscode.window.visibleTextEditors) {
			const file = activeTask.getFile(PathHelper.reducePath(editor.document.uri.fsPath));
			// an editor without marks gets an empty list: it may still show the marks of another task
			DecoratorHelper.refresh(editor, file ? file.lineNumbers : []);
		}
	}

	private static isErrorWithMessage(error: unknown): error is ErrorWithMessage {
		return typeof error === 'object' && error !== null && 'message' in error && typeof (error as Record<string, unknown>).message === 'string';
	}

	private static toErrorWithMessageAndStack(maybeError: unknown): ErrorWithMessage {
		if (Helper.isErrorWithMessage(maybeError)) {
			return maybeError;
		}

		try {
			return new Error(JSON.stringify(maybeError));
		} catch {
			// fallback in case there's an error stringifying the maybeError
			// like with circular references for example.
			return new Error(String(maybeError));
		}
	}

	static getErrorMessage(error: unknown) {
		return Helper.toErrorWithMessageAndStack(error).message;
	}

	static getErrorStack(error: unknown) {
		return Helper.toErrorWithMessageAndStack(error).stack;
	}
}

export interface MarkQuickPickItem extends vscode.QuickPickItem {
	filepath: string;
	mark: Mark;
}

type ErrorWithMessage = {
	message: string;
	stack?: string | undefined;
};
