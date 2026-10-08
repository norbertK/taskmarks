import * as vscode from 'vscode';

import { PathHelper } from './PathHelper';
import { MarkTracker } from './MarkTracker';
import { moveBreakpoints, toBreakpoint } from './core/breakpoints';
import type { IPersistBreakpoint } from './types';
import type { Task } from './Task';

// a breakpoint of VS Code with what is stored of it
interface ShownBreakpoint {
	breakpoint: IPersistBreakpoint;
	source: vscode.Breakpoint;
}

// Breakpoints per task (setting taskmarks.breakpointsPerTask): VS Code has one list of breakpoints for the window. When another task
// becomes the active one, the breakpoints that are set are stored with the task that was active, removed, and the ones of the new
// task are set. They are stored per user, in VS Code's storage for the workspace, by the name of the task - not in taskmarks.json:
// that file is shared, and breakpoints change all the time. What a task shares with the team is a copy (Task.sharedBreakpoints).
// Only source breakpoints in files of the workspace folder are handled. Function breakpoints and breakpoints elsewhere stay as they are.
export abstract class Breakpoints {
	private static readonly storedKey = 'taskmarks.breakpoints';
	private static readonly shownTaskKey = 'taskmarks.breakpointsTask';
	// VS Code hands over the breakpoints of the last session some time after the first listener is registered
	private static readonly startupDelay = 1000;

	private static _state: vscode.Memento | undefined;
	private static _activeTaskName: (() => string) | undefined;
	// the breakpoints of the tasks, by task name. The entry of the shown task is out of date: its breakpoints are the ones of VS Code
	private static _stored: Record<string, IPersistBreakpoint[]> = {};
	// the task the breakpoints of VS Code belong to, undefined while the setting is off
	private static _shownTaskName: string | undefined;
	// the shown task was deleted: its breakpoints are removed without being stored
	private static _discardShown = false;

	static init(context: vscode.ExtensionContext, activeTaskName: () => string): void {
		this._state = context.workspaceState;
		this._activeTaskName = activeTaskName;
		this._stored = { ...this._state.get<Record<string, IPersistBreakpoint[]>>(Breakpoints.storedKey, {}) };
		this._shownTaskName = this._state.get<string>(Breakpoints.shownTaskKey);
		this._discardShown = false;

		// nothing to do on a change, but VS Code only fills debug.breakpoints for an extension that listens
		vscode.debug.onDidChangeBreakpoints(() => undefined, null, context.subscriptions);

		if (Breakpoints.enabled && this._shownTaskName !== undefined && this._shownTaskName !== activeTaskName()) {
			// taskmarks.json came with another active task (a pull while VS Code was closed). The breakpoints of the last session
			// have to be there before they can be stored and removed.
			const timer = setTimeout(() => Breakpoints.showActiveTask(), Breakpoints.startupDelay);
			context.subscriptions.push({ dispose: () => clearTimeout(timer) });
		} else {
			Breakpoints.showActiveTask();
		}
	}

	private static get enabled(): boolean {
		return vscode.workspace.getConfiguration().get<boolean>('taskmarks.breakpointsPerTask') === true;
	}

	// Makes the breakpoints of VS Code the ones of the active task. Call when another task may be the active one (selected, created,
	// deleted, tasks reloaded) and when the setting changes.
	static showActiveTask(): void {
		if (!this._activeTaskName) {
			return;
		}
		const taskName = this._activeTaskName();
		if (!Breakpoints.enabled) {
			this._discardShown = false;
			Breakpoints.setShownTask(undefined);
			return;
		}
		if (this._shownTaskName === undefined) {
			// first use, or the setting was switched on: the breakpoints that are set belong to the active task
			Breakpoints.setShownTask(taskName);
			return;
		}
		if (this._shownTaskName === taskName && !this._discardShown) {
			return;
		}

		const shown = Breakpoints.readShown();
		if (!this._discardShown) {
			this._stored[this._shownTaskName] = shown.map(({ breakpoint }) => breakpoint);
		}
		this._discardShown = false;
		const toShow = this._stored[taskName] ?? [];
		this._shownTaskName = taskName;
		Breakpoints.saveState();
		Breakpoints.replaceShown(shown, toShow);
	}

	private static setShownTask(taskName: string | undefined): void {
		if (this._shownTaskName !== taskName) {
			this._shownTaskName = taskName;
			Breakpoints.saveState();
		}
	}

	private static saveState(): void {
		this._state?.update(Breakpoints.storedKey, this._stored);
		this._state?.update(Breakpoints.shownTaskKey, this._shownTaskName);
	}

	// call after a task was renamed: the breakpoints are stored by the name of their task
	static taskRenamed(oldTaskName: string, newTaskName: string): void {
		if (oldTaskName === newTaskName) {
			return;
		}
		if (this._stored[oldTaskName]) {
			this._stored[newTaskName] = this._stored[oldTaskName];
			delete this._stored[oldTaskName];
		}
		if (this._shownTaskName === oldTaskName) {
			this._shownTaskName = newTaskName;
		}
		Breakpoints.saveState();
	}

	// call after a task was deleted, before showActiveTask(): its breakpoints go with it
	static taskDeleted(taskName: string): void {
		delete this._stored[taskName];
		this._discardShown = this._shownTaskName === taskName;
		Breakpoints.saveState();
	}

	// how many breakpoints "Delete Task" would remove
	static countOfTask(taskName: string): number {
		if (!Breakpoints.enabled) {
			return 0;
		}
		return this._shownTaskName === taskName ? Breakpoints.readShown().length : (this._stored[taskName]?.length ?? 0);
	}

	// VS Code moves the breakpoints it shows when their file is edited. The stored ones of the other tasks and the shared ones of all
	// tasks are only line numbers here, so they are moved like marks.
	// true if shared breakpoints were moved or removed - the caller has to save.
	static documentChanged(event: vscode.TextDocumentChangeEvent, tasks: Task[]): boolean {
		if (event.contentChanges.length === 0 || event.document.uri.scheme !== 'file') {
			return false;
		}
		const filepath = PathHelper.reducePath(event.document.uri.fsPath);
		const changes = MarkTracker.textChanges(event);
		const lineCount = event.document.lineCount;

		let storedChanged = false;
		for (const taskName of Object.keys(this._stored)) {
			const moved = taskName === this._shownTaskName ? undefined : moveBreakpoints(this._stored[taskName], filepath, changes, lineCount);
			if (moved) {
				this._stored[taskName] = moved;
				storedChanged = true;
			}
		}
		if (storedChanged) {
			Breakpoints.saveState();
		}

		let sharedChanged = false;
		for (const task of tasks) {
			const moved = moveBreakpoints(task.sharedBreakpoints, filepath, changes, lineCount);
			if (moved) {
				task.sharedBreakpoints = moved;
				sharedChanged = true;
			}
		}
		return sharedChanged;
	}

	// the breakpoints that are set in files of the workspace folder
	static current(): IPersistBreakpoint[] {
		return Breakpoints.readShown().map(({ breakpoint }) => breakpoint);
	}

	// sets breakpoints in addition to the ones that are set
	static add(breakpoints: IPersistBreakpoint[]): void {
		Breakpoints.replaceShown([], breakpoints);
	}

	private static readShown(): ShownBreakpoint[] {
		const shown: ShownBreakpoint[] = [];
		for (const source of vscode.debug.breakpoints) {
			if (!(source instanceof vscode.SourceBreakpoint) || source.location.uri.scheme !== 'file') {
				continue;
			}
			const fullPath = source.location.uri.fsPath;
			const { line, character } = source.location.range.start;
			const breakpoint = PathHelper.isInWorkspace(fullPath)
				? toBreakpoint({
						filepath: PathHelper.reducePath(fullPath),
						lineNumber: line,
						column: character,
						enabled: source.enabled,
						condition: source.condition,
						hitCondition: source.hitCondition,
						logMessage: source.logMessage,
					})
				: undefined;
			if (breakpoint) {
				shown.push({ breakpoint, source });
			}
		}
		return shown;
	}

	private static replaceShown(toRemove: ShownBreakpoint[], toAdd: IPersistBreakpoint[]): void {
		if (toRemove.length > 0) {
			vscode.debug.removeBreakpoints(toRemove.map(({ source }) => source));
		}
		if (toAdd.length > 0) {
			vscode.debug.addBreakpoints(
				toAdd.map(
					(breakpoint) =>
						new vscode.SourceBreakpoint(
							new vscode.Location(
								vscode.Uri.file(PathHelper.getFullPath(breakpoint.filepath)),
								new vscode.Position(breakpoint.lineNumber, breakpoint.column ?? 0)
							),
							breakpoint.enabled !== false,
							breakpoint.condition,
							breakpoint.hitCondition,
							breakpoint.logMessage
						)
				)
			);
		}
	}
}
