import * as vscode from 'vscode';
import { basename, dirname } from 'path';

import { TaskManager } from './TaskManager';
import { Persist } from './Persist';
import { DecoratorHelper } from './DecoratorHelper';
import { PathHelper } from './PathHelper';
import { MarkTracker } from './MarkTracker';
import { getErrorMessage, getErrorStack } from './core/errors';

// Connects the tasks with VS Code: loads them, listens to the events of the editor and of taskmarks.json,
// shows the marks and the active task, saves. The commands are in Commands.ts.
export abstract class Helper {
	private static _taskManager: TaskManager;
	private static _outputChannel: vscode.OutputChannel;
	private static _statusBarItem: vscode.StatusBarItem | undefined;

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

	static get taskManager(): TaskManager {
		return this._taskManager;
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
			this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
			context.subscriptions.push(this._statusBarItem);

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
	static triggerChangeActiveFile(): void {
		this.changeActiveFile(vscode.window.activeTextEditor);
	}

	private static initEditorChangeHandlers(context: vscode.ExtensionContext): void {
		this.changeActiveFile(vscode.window.activeTextEditor);
		vscode.window.onDidChangeActiveTextEditor((editor) => this.changeActiveFile(editor), null, context.subscriptions);
		// an editor that becomes visible without becoming the active one (split view) needs its marks as well
		vscode.window.onDidChangeVisibleTextEditors(() => this.refresh(), null, context.subscriptions);
		// taskmarks.showLabelInEditor is used when the marks are shown
		vscode.workspace.onDidChangeConfiguration(
			(event) => {
				if (event.affectsConfiguration('taskmarks')) {
					this.refresh();
				}
			},
			null,
			context.subscriptions
		);
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
				MarkTracker.forgetRemovals();
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

	static documentChanged(event: vscode.TextDocumentChangeEvent): void {
		try {
			if (MarkTracker.documentChanged(event, this._taskManager.allTasks)) {
				Helper.refresh();
				Helper.save();
			}
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	// a failed write is reported, not thrown: most callers are event handlers, and the next save tries again
	static save(): void {
		try {
			Persist.saveTaskmarksJson();
		} catch (error: unknown) {
			Helper.reportError({ message: `taskmarks.json could not be saved: ${Helper.getErrorMessage(error)}` });
		}
	}

	// the active file is where next / previous bookmark start from
	static changeActiveFile(editor: vscode.TextEditor | undefined): void {
		if (editor) {
			this._taskManager.activeTask.use(editor.document.uri.fsPath);
		}
		this.refresh();
	}

	// shows the active task: its name in the status bar, its marks and their labels in every visible editor (split view shows several files, or one file twice)
	static refresh(): void {
		const activeTask = this._taskManager.activeTask;
		if (this._statusBarItem) {
			this._statusBarItem.text = 'TaskMarks: ' + activeTask.name;
			this._statusBarItem.show();
		}
		// on, unless the setting says no (it is also missing while the extension is not activated by VS Code, as in tests)
		const showLabels = vscode.workspace.getConfiguration().get<boolean>('taskmarks.showLabelInEditor') !== false;
		const markedLines = new Set<number>();
		for (const editor of vscode.window.visibleTextEditors) {
			const file = activeTask.getFile(PathHelper.reducePath(editor.document.uri.fsPath));
			// an editor without marks gets an empty list: it may still show the marks of another task
			DecoratorHelper.refresh(editor, file ? file.allPersistMarks : [], showLabels);
			file?.lineNumbers.forEach((lineNumber) => markedLines.add(lineNumber + 1));
		}
		// For "Edit Bookmark Label" in the menu of the line numbers, which is only offered on these lines (package.json:
		// "editorLineNumber in taskmarks.markedLines"). The menu counts lines from 1. There is one list for all visible editors,
		// so with two files side by side the entry can show up on a line that is only marked in the other file.
		vscode.commands.executeCommand('setContext', 'taskmarks.markedLines', [...markedLines]);
	}

	static getErrorMessage(error: unknown) {
		return getErrorMessage(error);
	}

	static getErrorStack(error: unknown) {
		return getErrorStack(error);
	}
}
