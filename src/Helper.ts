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
	private static _markRemovals = new Map<string, MarkRemoval[]>();
	private static _activeEditor: vscode.TextEditor | undefined;
	private static _taskManager: TaskManager;
	private static _outputChannel: vscode.OutputChannel;

	static reportError = ({ message, stack }: { message: string; stack?: string }) => {
		if (Helper.outputChannel) {
			// send the error to our logging service...
			Helper.outputChannel.appendLine(message);
			if (stack) {
				Helper.outputChannel.appendLine(stack);
			}
			Helper.outputChannel.show(true);
		} else {
			console.log(message);
		}
	};

	static get activeEditor(): vscode.TextEditor | undefined {
		return this._activeEditor;
	}
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

			Helper.initActiveEditorChangeHandler();
			Helper.initSaveHandler();
			Helper.initChangeHandler(context);
			Helper.initTaskmarksFileWatcher(context);
		} catch (error: unknown) {
			const message = Helper.getErrorMessage(error);
			const stack = Helper.getErrorStack(error);
			Helper.reportError({ message, stack });
			throw error;
		}
	}

	private static triggerChangeActiveFile(): void {
		this._activeEditor = undefined;
		const activeTextEditor = vscode.window.activeTextEditor;
		if (activeTextEditor) {
			this.changeActiveFile(activeTextEditor);
		}
	}

	private static initActiveEditorChangeHandler(): void {
		const activeTextEditor = vscode.window.activeTextEditor;
		if (activeTextEditor) {
			this.changeActiveFile(activeTextEditor);
		}
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			this.changeActiveFile(editor);
		}, null);
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

	private static initSaveHandler(): void {
		vscode.workspace.onDidSaveTextDocument(() => {
			if (!this._taskManager.activeTask) {
				return;
			}
			Helper.save();
		});
	}

	private static initChangeHandler(context: vscode.ExtensionContext): void {
		vscode.workspace.onDidChangeTextDocument(
			(event) => {
				if (!this._activeEditor || event.document !== this._activeEditor.document) {
					return;
				}
				const activeFile = this._taskManager.activeTask?.activeFile;
				if (!activeFile || event.contentChanges.length === 0) {
					return;
				}
				const isUndo = event.reason === vscode.TextDocumentChangeReason.Undo;
				const removals = this._markRemovals.get(activeFile.filepath) ?? [];
				if (activeFile.marks.length === 0 && !(isUndo && removals.length > 0)) {
					return;
				}

				const changes: TextChange[] = event.contentChanges.map((c) => ({
					startLine: c.range.start.line,
					startCharacter: c.range.start.character,
					endLine: c.range.end.line,
					endCharacter: c.range.end.character,
					text: c.text,
				}));
				const marks = [...activeFile.marks];
				const newLines = mapMarkLines(
					marks.map((mark) => mark.lineNumber),
					changes,
					event.document.lineCount
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
					this._markRemovals.set(activeFile.filepath, removals);
				}

				const restored: RemovedMark[] = [];
				if (isUndo) {
					const index = findUndoneRemoval(removals, changes);
					if (index > -1) {
						restored.push(...removals.splice(index, 1)[0].marks.filter((mark) => mark.lineNumber < event.document.lineCount));
					}
				}

				if (!changed && restored.length === 0) {
					return;
				}

				activeFile.removeMarks(marksToRemove);
				restored.forEach((mark) => activeFile.addMark(mark));
				this._taskManager.activeTask.syncFile(activeFile);
				Helper.refresh();
				Helper.save();
			},
			null,
			context.subscriptions
		);
	}

	// one entry per mark of the task: the label (or the text of the marked line, without indentation), the line number and the file
	// built from the documents on every call, as line numbers and line texts change while a file is edited
	// a file that can't be read is reported and left out, a mark behind the last line of its file is left out
	static async getMarkQuickPickItems(task: Task): Promise<MarkQuickPickItem[]> {
		const quickPickItems: MarkQuickPickItem[] = [];
		for (const file of task.files) {
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
		if (!this._taskManager.activeTask) {
			return;
		}
		try {
			const options: vscode.QuickPickOptions = {
				placeHolder: 'select Bookmark',
			};

			const quickPickItems = await this.getMarkQuickPickItems(this._taskManager.activeTask);
			const result = await vscode.window.showQuickPick(quickPickItems, options);
			if (result) {
				DecoratorHelper.openAndShow(result.filepath, result.mark.lineNumber);
			}
		} catch (error: unknown) {
			const message = Helper.getErrorMessage(error);
			Helper.reportError({ message });
			throw error;
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
				// the pasted task may have brought marks for the file in the active editor
				Helper.refresh();
				Helper.save();
			}
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	static async selectTask(): Promise<void> {
		try {
			const options: vscode.QuickPickOptions = {
				placeHolder: 'select Task ',
			};
			const taskNames: string[] = [];
			taskNames.push(this._taskManager.activeTask.name);
			this._taskManager.taskNames.forEach((tn) => {
				if (tn !== this._taskManager.activeTask.name) {
					taskNames.push(tn);
				}
			});
			vscode.window.showQuickPick(taskNames, options).then((taskName) => {
				if (taskName) {
					this._taskManager.useActiveTask(taskName);
				}

				Helper.triggerChangeActiveFile();
				Helper.save();
			});
		} catch (error: unknown) {
			const message = Helper.getErrorMessage(error);
			Helper.reportError({ message });
			throw error;
		}
	}

	static async renameTask(): Promise<void> {
		try {
			const options: vscode.QuickPickOptions = {
				placeHolder: 'rename Task ',
			};
			const taskNames: string[] = [];
			taskNames.push(this._taskManager.activeTask.name);
			this._taskManager.taskNames.forEach((tn) => {
				if (tn !== this._taskManager.activeTask.name) {
					taskNames.push(tn);
				}
			});
			vscode.window.showQuickPick(taskNames, options).then((oldTaskName) => {
				if (!oldTaskName) {
					return;
				}
				vscode.window.showInputBox({ prompt: `New name for task '${oldTaskName}'`, value: oldTaskName }).then((newTaskName) => {
					if (!newTaskName) {
						return;
					}
					if (!this._taskManager.renameTask(oldTaskName, newTaskName)) {
						vscode.window.showInformationMessage(`Taskmarks: there is already a task named '${newTaskName}'.`);
						return;
					}
					// save here, not after showInputBox() was called - then the new name is not known yet
					Helper.save();
				});
			});
		} catch (error: unknown) {
			const message = Helper.getErrorMessage(error);
			Helper.reportError({ message });
			throw error;
		}
	}

	static async createTask(): Promise<void> {
		try {
			vscode.window.showInputBox({ prompt: 'Name of the new task', placeHolder: 'e.g. bugfix-login' }).then((newTaskName) => {
				if (newTaskName) {
					this._taskManager.useActiveTask(newTaskName);

					Helper.triggerChangeActiveFile();
					Helper.save();
				}
			});
		} catch (error: unknown) {
			const message = Helper.getErrorMessage(error);
			Helper.reportError({ message });
			throw error;
		}
	}

	static deleteTask(): void {
		try {
			vscode.window
				.showQuickPick(this._taskManager.taskNames, {
					placeHolder: 'delete Task ',
				})
				.then((taskName) => {
					if (taskName) {
						this._taskManager.delete(taskName);
					}

					Helper.triggerChangeActiveFile();
					Helper.save();
				});
		} catch (error: unknown) {
			const message = Helper.getErrorMessage(error);
			Helper.reportError({ message });
			throw error;
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
			const enableLabel = vscode.workspace.getConfiguration().get<boolean>('taskmarks.enableLabel');

			if (!activeTextEditor || !this._taskManager.activeTask) {
				return;
			}
			const activeLine = activeTextEditor.selection.active.line;

			const fullName = activeTextEditor.document.fileName;
			if (!PathHelper.isInWorkspace(fullName)) {
				// such a path can't be stored workspace-relative, the mark would be lost with the next reload
				vscode.window.showInformationMessage('Taskmarks: bookmarks can only be set in files inside the workspace folder.');
				return;
			}
			if (enableLabel && !this._taskManager.activeTask.lineHasMark(fullName, activeLine)) {
				vscode.window.showInputBox({ prompt: 'Label for this bookmark (shown in "Select Bookmark from List")' }).then((newLabel) => {
					if (newLabel) {
						this._taskManager.activeTask.toggle(fullName, activeLine, newLabel);
					}
					Helper.save();
					Helper.triggerChangeActiveFile();
				});
			} else {
				this._taskManager.activeTask.toggle(activeTextEditor.document.fileName, activeLine, '');
				Helper.save();
				Helper.triggerChangeActiveFile();
			}
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	static changeActiveFile(editor: vscode.TextEditor | undefined): void {
		if (this._activeEditor === editor || !this._taskManager.activeTask) {
			return;
		}
		this._activeEditor = editor;
		if (editor) {
			this._taskManager.activeTask.use(editor.document.uri.fsPath);
			this.refresh();
		}
	}

	static refresh(): void {
		if (this._activeEditor) {
			const activeFile = this._taskManager.activeTask.activeFile;

			if (activeFile) {
				DecoratorHelper.refresh(this._activeEditor, activeFile.lineNumbers);
			}
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
