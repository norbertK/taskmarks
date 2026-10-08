import * as vscode from 'vscode';

import { Helper } from './Helper';
import { Persist } from './Persist';
import { DecoratorHelper } from './DecoratorHelper';
import { PathHelper } from './PathHelper';
import { findNextFileWithMarks, findNextMark, findPreviousFileWithMarks, findPreviousMark } from './core/navigation';
import type { File } from './File';
import type { Mark } from './Mark';
import type { Task } from './Task';

export interface MarkQuickPickItem extends vscode.QuickPickItem {
	filepath: string;
	mark: Mark;
}

// What VS Code hands to a command of the line number menu (editor/lineNumber/context in package.json):
// the line that was right-clicked, counted from 1, and its document.
export interface LineMenuTarget {
	lineNumber: number;
	uri: vscode.Uri;
}

// a line (counted from 0) of a file (full path)
interface LinePosition {
	fullName: string;
	line: number;
}

// The commands of the extension (see extension.ts). Each one awaits its prompts and reports errors instead of throwing;
// cancelling a prompt changes and saves nothing.
export abstract class Commands {
	// the line of the cursor in the active editor
	private static cursorPosition(): LinePosition | undefined {
		const activeTextEditor = vscode.window.activeTextEditor;
		return activeTextEditor ? { fullName: activeTextEditor.document.fileName, line: activeTextEditor.selection.active.line } : undefined;
	}

	// the line that was right-clicked - the line of the cursor, if the command is run in another way (a keybinding of the user)
	private static menuPosition(target: LineMenuTarget | undefined): LinePosition | undefined {
		return target?.uri ? { fullName: target.uri.fsPath, line: target.lineNumber - 1 } : Commands.cursorPosition();
	}

	static async toggleMark(): Promise<void> {
		await Commands.toggleMarkAt(Commands.cursorPosition());
	}

	// "Toggle Bookmark" in the menu of the line numbers
	static async toggleMarkAtLine(target?: LineMenuTarget): Promise<void> {
		await Commands.toggleMarkAt(Commands.menuPosition(target));
	}

	private static async toggleMarkAt(position: LinePosition | undefined): Promise<void> {
		try {
			if (!position) {
				return;
			}
			const activeTask = Helper.taskManager.activeTask;
			const { fullName, line: activeLine } = position;

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

	// changes the label of the bookmark in the line of the cursor - also while taskmarks.enableLabel is off: the command is asked for
	static async editLabel(): Promise<void> {
		await Commands.editLabelAt(Commands.cursorPosition());
	}

	// "Edit Bookmark Label" in the menu of the line numbers
	static async editLabelAtLine(target?: LineMenuTarget): Promise<void> {
		await Commands.editLabelAt(Commands.menuPosition(target));
	}

	private static async editLabelAt(position: LinePosition | undefined): Promise<void> {
		try {
			if (!position) {
				return;
			}
			const file = Helper.taskManager.activeTask.getFile(PathHelper.reducePath(position.fullName));
			const mark = file?.getMark(position.line);
			if (!mark) {
				vscode.window.showInformationMessage('Taskmarks: there is no bookmark in this line.');
				return;
			}
			const label = await vscode.window.showInputBox({
				prompt: 'Label for this bookmark (shown in "Select Bookmark from List"). Leave empty for a bookmark without label.',
				value: mark.label,
			});
			// Escape cancels, Enter on the emptied box removes the label
			if (label === undefined || label === mark.label) {
				return;
			}
			mark.label = label;
			// the label is shown behind its line
			Helper.refresh();
			Helper.save();
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	// to the next mark below the cursor, from the last mark of a file on to the next file with marks
	static async nextMark(): Promise<void> {
		try {
			const activeTextEditor = vscode.window.activeTextEditor;
			const activeFile = Helper.taskManager.activeTask.activeFile;
			if (!activeTextEditor || !activeFile) {
				return;
			}
			const nextLine = findNextMark(activeTextEditor.selection.active.line, activeFile.lineNumbers);
			if (nextLine !== undefined) {
				DecoratorHelper.showLine(nextLine);
			} else {
				await Commands.nextDocument();
			}
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	static async previousMark(): Promise<void> {
		try {
			const activeTextEditor = vscode.window.activeTextEditor;
			const activeFile = Helper.taskManager.activeTask.activeFile;
			if (!activeTextEditor || !activeFile) {
				return;
			}
			const previousLine = findPreviousMark(activeTextEditor.selection.active.line, activeFile.lineNumbers);
			if (previousLine !== undefined) {
				DecoratorHelper.showLine(previousLine);
			} else {
				await Commands.previousDocument();
			}
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	// to the first mark of the next file with marks, after the last file on to the first one
	static async nextDocument(): Promise<void> {
		const files = Commands.filesOnDisk();
		const target = findNextFileWithMarks(files, Commands.activeFileIndex(files));
		if (target) {
			await DecoratorHelper.openAndShow(target.filepath, target.lineNumber);
		}
	}

	// to the last mark of the previous file with marks, before the first file on to the last one
	static async previousDocument(): Promise<void> {
		const files = Commands.filesOnDisk();
		const target = findPreviousFileWithMarks(files, Commands.activeFileIndex(files));
		if (target) {
			await DecoratorHelper.openAndShow(target.filepath, target.lineNumber);
		}
	}

	// taskmarks.json keeps the marks of files that don't exist here (a teammate's file, another branch).
	// Navigation has to leave them out: such a file can't be opened, and next / previous would never get past it.
	private static filesOnDisk(): File[] {
		return Helper.taskManager.activeTask.files.filter((file) => PathHelper.fileExists(file.filepath));
	}

	// -1 if there is no active file or it is not (or no longer) one of the files
	private static activeFileIndex(files: File[]): number {
		const activeFile = Helper.taskManager.activeTask.activeFile;
		return activeFile ? files.indexOf(activeFile) : -1;
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

			const quickPickItems = await Commands.getMarkQuickPickItems(Helper.taskManager.activeTask);
			const result = await vscode.window.showQuickPick(quickPickItems, options);
			if (result) {
				await DecoratorHelper.openAndShow(result.filepath, result.mark.lineNumber);
			}
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
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
		const activeTaskName = Helper.taskManager.activeTask.name;
		return [activeTaskName, ...Helper.taskManager.taskNames.filter((taskName) => taskName !== activeTaskName)];
	}

	static async selectTask(): Promise<void> {
		try {
			const taskName = await vscode.window.showQuickPick(Commands.taskNamesActiveFirst(), { placeHolder: 'select Task ' });
			if (!taskName) {
				return;
			}
			Helper.taskManager.useActiveTask(taskName);
			Helper.triggerChangeActiveFile();
			Helper.save();
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	static async renameTask(): Promise<void> {
		try {
			const oldTaskName = await vscode.window.showQuickPick(Commands.taskNamesActiveFirst(), { placeHolder: 'rename Task ' });
			if (!oldTaskName) {
				return;
			}
			const newTaskName = await vscode.window.showInputBox({ prompt: `New name for task '${oldTaskName}'`, value: oldTaskName });
			if (!newTaskName) {
				return;
			}
			if (!Helper.taskManager.renameTask(oldTaskName, newTaskName)) {
				vscode.window.showInformationMessage(`Taskmarks: there is already a task named '${newTaskName}'.`);
				return;
			}
			// the status bar shows the name of the active task
			Helper.refresh();
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
			Helper.taskManager.useActiveTask(newTaskName);
			Helper.triggerChangeActiveFile();
			Helper.save();
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}

	static async deleteTask(): Promise<void> {
		try {
			const taskName = await vscode.window.showQuickPick(Helper.taskManager.taskNames, { placeHolder: 'delete Task ' });
			if (!taskName) {
				return;
			}
			// a deleted task can't be brought back, so ask before bookmarks are lost
			const task = Helper.taskManager.allTasks.find((task) => task.name === taskName);
			const markCount = task ? task.files.reduce((count, file) => count + file.marks.length, 0) : 0;
			if (markCount > 0) {
				const deleteIt = 'Delete';
				const bookmarks = markCount === 1 ? 'its bookmark' : `its ${markCount} bookmarks`;
				const answer = await vscode.window.showWarningMessage(`Delete task '${taskName}' with ${bookmarks}?`, { modal: true }, deleteIt);
				if (answer !== deleteIt) {
					return;
				}
			}
			Helper.taskManager.delete(taskName);
			Helper.triggerChangeActiveFile();
			Helper.save();
		} catch (error: unknown) {
			Helper.reportError({ message: Helper.getErrorMessage(error) });
		}
	}
}
