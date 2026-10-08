import * as vscode from 'vscode';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { tmpdir } from 'os';
import { join } from 'path';
import { Breakpoints } from '../../Breakpoints';
import { PathHelper } from '../../PathHelper';
import { Task } from '../../Task';
import type { IPersistBreakpoint } from '../../types';

describe('Breakpoints', () => {
	// as VS Code writes the path (in a real VS Code with a lower case drive letter)
	const basePath = vscode.Uri.file(join(tmpdir(), 'taskmarks-breakpoints')).fsPath;
	const fullPathA = join(basePath, 'src', 'a.ts');
	const fullPathB = join(basePath, 'src', 'b.ts');
	const fileA = fullPathA.substring(basePath.length);
	const fileB = fullPathB.substring(basePath.length);

	let previousBasePath: string;
	let enabled: boolean;
	let activeTaskName: string;
	// VS Code's storage for the workspace
	let state: Record<string, unknown>;
	let subscriptions: { dispose: () => void }[];
	let context: vscode.ExtensionContext;

	function init(): void {
		Breakpoints.init(context, () => activeTaskName);
	}

	function stored(): Record<string, IPersistBreakpoint[]> {
		return state['taskmarks.breakpoints'] as Record<string, IPersistBreakpoint[]>;
	}

	beforeEach(() => {
		previousBasePath = PathHelper.basePath;
		PathHelper.basePath = basePath;
		enabled = true;
		activeTaskName = 'a';
		state = {};
		subscriptions = [];
		context = {
			subscriptions,
			workspaceState: {
				get: (key: string, fallback?: unknown) => state[key] ?? fallback,
				update: (key: string, value: unknown) => {
					// what is stored is a copy
					state[key] = value === undefined ? undefined : JSON.parse(JSON.stringify(value));
					return Promise.resolve();
				},
			},
		} as unknown as vscode.ExtensionContext;
		sinon.replace(
			vscode.workspace,
			'getConfiguration',
			sinon.fake.returns({ get: (key: string) => (key === 'taskmarks.breakpointsPerTask' ? enabled : undefined) }) as any
		);
	});

	afterEach(() => {
		sinon.restore();
		subscriptions.forEach((subscription) => subscription?.dispose());
		(Breakpoints as any)._activeTaskName = undefined;
		(Breakpoints as any)._state = undefined;
		(Breakpoints as any)._stored = {};
		(Breakpoints as any)._shownTaskName = undefined;
		(Breakpoints as any)._discardShown = false;
		PathHelper.basePath = previousBasePath;
	});

	// the logic, with a list that stands in for the breakpoints of VS Code
	describe('per task', () => {
		let shown: IPersistBreakpoint[];
		const breakpointA: IPersistBreakpoint = { filepath: fileA, lineNumber: 3 };
		const breakpointB: IPersistBreakpoint = { filepath: fileB, lineNumber: 7, condition: 'x > 1' };

		function selectTask(taskName: string): void {
			activeTaskName = taskName;
			Breakpoints.showActiveTask();
		}

		beforeEach(() => {
			shown = [];
			sinon.stub(Breakpoints as any, 'readShown').callsFake(() => shown.map((breakpoint) => ({ breakpoint, source: breakpoint })));
			sinon.stub(Breakpoints as any, 'replaceShown').callsFake((toRemove: any, toAdd: any) => {
				shown = [...shown.filter((breakpoint) => !toRemove.some(({ source }: { source: unknown }) => source === breakpoint)), ...toAdd];
			});
		});

		it('should take the breakpoints that are set as the ones of the active task on first use', () => {
			shown = [breakpointA];

			init();

			expect(shown).to.deep.equal([breakpointA]);
			expect(state['taskmarks.breakpointsTask']).to.equal('a');
		});

		it('should store the breakpoints with the task that is left and show the ones of the selected task', () => {
			shown = [breakpointA];
			init();

			selectTask('b');
			expect(shown).to.deep.equal([]);
			expect(stored().a).to.deep.equal([breakpointA]);
			expect(state['taskmarks.breakpointsTask']).to.equal('b');

			shown = [breakpointB];
			selectTask('a');
			expect(shown).to.deep.equal([breakpointA]);
			expect(stored().b).to.deep.equal([breakpointB]);

			selectTask('b');
			expect(shown).to.deep.equal([breakpointB]);
		});

		it('should listen to the breakpoints of VS Code, which only fills its list for an extension that does', () => {
			const onDidChangeBreakpoints = sinon.fake();
			sinon.replace(vscode.debug, 'onDidChangeBreakpoints', onDidChangeBreakpoints as any);
			shown = [breakpointA];

			init();
			onDidChangeBreakpoints.firstCall.args[0]();

			expect(onDidChangeBreakpoints.calledOnce).to.be.true;
			expect(shown).to.deep.equal([breakpointA]);
		});

		it('should do nothing while the same task stays the active one', () => {
			shown = [breakpointA];
			init();

			Breakpoints.showActiveTask();

			expect(shown).to.deep.equal([breakpointA]);
			expect((Breakpoints as any).replaceShown.called).to.be.false;
		});

		it('should know the breakpoints of the tasks in the next session', () => {
			shown = [breakpointA];
			init();
			selectTask('b');
			shown = [breakpointB];

			// a new session: VS Code has kept the breakpoints that were set, the storage has the rest
			(Breakpoints as any)._stored = {};
			(Breakpoints as any)._shownTaskName = undefined;
			init();
			expect(shown).to.deep.equal([breakpointB]);

			selectTask('a');
			expect(shown).to.deep.equal([breakpointA]);
		});

		it('should wait for the breakpoints of the last session when taskmarks.json came with another active task', () => {
			const clock = sinon.useFakeTimers();
			state['taskmarks.breakpointsTask'] = 'a';
			state['taskmarks.breakpoints'] = { b: [breakpointB] };
			activeTaskName = 'b';

			init();
			// VS Code hands the breakpoints over after the extension has started
			shown = [breakpointA];
			clock.tick(999);
			expect(shown).to.deep.equal([breakpointA]);

			clock.tick(1);
			expect(shown).to.deep.equal([breakpointB]);
			expect(stored().a).to.deep.equal([breakpointA]);
		});

		it('should not switch after the extension was stopped', () => {
			const clock = sinon.useFakeTimers();
			state['taskmarks.breakpointsTask'] = 'a';
			activeTaskName = 'b';
			init();
			shown = [breakpointA];

			subscriptions.forEach((subscription) => subscription?.dispose());
			clock.tick(5000);

			expect(shown).to.deep.equal([breakpointA]);
		});

		it('should leave the breakpoints alone while the setting is off', () => {
			enabled = false;
			shown = [breakpointA];
			init();

			selectTask('b');

			expect(shown).to.deep.equal([breakpointA]);
			expect(state['taskmarks.breakpointsTask']).to.be.undefined;
		});

		it('should take the breakpoints that are set as the ones of the active task when the setting is switched on', () => {
			enabled = false;
			init();
			selectTask('b');
			shown = [breakpointB];

			enabled = true;
			Breakpoints.showActiveTask();
			selectTask('a');

			expect(shown).to.deep.equal([]);
			expect(stored().b).to.deep.equal([breakpointB]);
		});

		it('should forget which task is shown when the setting is switched off, and keep what is stored', () => {
			shown = [breakpointA];
			init();
			selectTask('b');

			enabled = false;
			Breakpoints.showActiveTask();

			expect(state['taskmarks.breakpointsTask']).to.be.undefined;
			expect(stored().a).to.deep.equal([breakpointA]);
		});

		it('should do nothing before it is initialized', () => {
			shown = [breakpointA];
			Breakpoints.showActiveTask();
			expect(shown).to.deep.equal([breakpointA]);
			expect(state).to.deep.equal({});
		});

		describe('taskRenamed', () => {
			it('should keep the stored breakpoints with the renamed task', () => {
				shown = [breakpointA];
				init();
				selectTask('b');

				Breakpoints.taskRenamed('a', 'renamed');
				selectTask('renamed');

				expect(shown).to.deep.equal([breakpointA]);
				expect(stored().a).to.be.undefined;
			});

			it('should keep the shown breakpoints with the renamed task', () => {
				shown = [breakpointA];
				init();

				Breakpoints.taskRenamed('a', 'renamed');
				activeTaskName = 'renamed';
				Breakpoints.showActiveTask();

				expect(shown).to.deep.equal([breakpointA]);
				expect(state['taskmarks.breakpointsTask']).to.equal('renamed');
			});

			it('should change nothing when the name stays', () => {
				shown = [breakpointA];
				init();
				selectTask('b');

				Breakpoints.taskRenamed('a', 'a');

				expect(stored().a).to.deep.equal([breakpointA]);
			});
		});

		describe('taskDeleted', () => {
			it('should drop the stored breakpoints of the task', () => {
				shown = [breakpointA];
				init();
				selectTask('b');

				Breakpoints.taskDeleted('a');
				selectTask('a');

				expect(shown).to.deep.equal([]);
			});

			it('should remove the breakpoints of the deleted active task and show the ones of the next', () => {
				shown = [breakpointA];
				init();
				selectTask('b');
				shown = [breakpointB];

				Breakpoints.taskDeleted('b');
				selectTask('a');

				expect(shown).to.deep.equal([breakpointA]);
				expect(stored().b).to.be.undefined;
			});

			it('should remove the breakpoints when the deleted task is replaced by one with the same name (default)', () => {
				activeTaskName = 'default';
				shown = [breakpointA];
				init();

				Breakpoints.taskDeleted('default');
				Breakpoints.showActiveTask();

				expect(shown).to.deep.equal([]);
			});

			it('should leave the breakpoints alone while the setting is off', () => {
				enabled = false;
				shown = [breakpointA];
				init();

				Breakpoints.taskDeleted('a');
				selectTask('default');
				enabled = true;
				Breakpoints.showActiveTask();

				expect(shown).to.deep.equal([breakpointA]);
			});
		});

		describe('countOfTask', () => {
			it('should count the breakpoints that are set for the shown task and the stored ones for another', () => {
				shown = [breakpointA];
				init();
				selectTask('b');
				shown = [breakpointB, { filepath: fileB, lineNumber: 9 }];

				expect(Breakpoints.countOfTask('a')).to.equal(1);
				expect(Breakpoints.countOfTask('b')).to.equal(2);
				expect(Breakpoints.countOfTask('unknown')).to.equal(0);
			});

			it('should count none while the setting is off', () => {
				enabled = false;
				shown = [breakpointA];
				init();
				expect(Breakpoints.countOfTask('a')).to.equal(0);
			});
		});

		describe('documentChanged', () => {
			function lineInsertedAtTop(fullPath: string, scheme = 'file'): vscode.TextDocumentChangeEvent {
				return {
					document: { uri: { scheme, fsPath: fullPath }, lineCount: 50 },
					contentChanges: [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, text: 'new\n' }],
				} as unknown as vscode.TextDocumentChangeEvent;
			}

			it('should move the stored breakpoints of the tasks that are not shown', () => {
				shown = [breakpointA];
				init();
				selectTask('b');
				shown = [{ filepath: fileA, lineNumber: 20 }];
				selectTask('c');

				const saveNeeded = Breakpoints.documentChanged(lineInsertedAtTop(fullPathA), []);

				expect(saveNeeded).to.be.false;
				expect(stored().a).to.deep.equal([{ filepath: fileA, lineNumber: 4 }]);
				expect(stored().b).to.deep.equal([{ filepath: fileA, lineNumber: 21 }]);
			});

			it('should leave the entry of the shown task alone: VS Code moves its breakpoints', () => {
				shown = [breakpointA];
				init();
				selectTask('b');
				selectTask('a');

				Breakpoints.documentChanged(lineInsertedAtTop(fullPathA), []);

				expect(stored().a).to.deep.equal([breakpointA]);
			});

			it('should move the shared breakpoints of every task and say that they have to be saved', () => {
				const task = new Task('a');
				task.sharedBreakpoints = [{ filepath: fileA, lineNumber: 3 }];
				const other = new Task('b');
				other.sharedBreakpoints = [{ filepath: fileB, lineNumber: 3 }];

				const saveNeeded = Breakpoints.documentChanged(lineInsertedAtTop(fullPathA), [task, other]);

				expect(saveNeeded).to.be.true;
				expect(task.sharedBreakpoints).to.deep.equal([{ filepath: fileA, lineNumber: 4 }]);
				expect(other.sharedBreakpoints).to.deep.equal([{ filepath: fileB, lineNumber: 3 }]);
			});

			it('should ignore an event without changes and documents that are not files', () => {
				const task = new Task('a');
				task.sharedBreakpoints = [{ filepath: fileA, lineNumber: 3 }];

				expect(Breakpoints.documentChanged({ ...lineInsertedAtTop(fullPathA), contentChanges: [] }, [task])).to.be.false;
				expect(Breakpoints.documentChanged(lineInsertedAtTop(fullPathA, 'untitled'), [task])).to.be.false;
				expect(task.sharedBreakpoints).to.deep.equal([{ filepath: fileA, lineNumber: 3 }]);
			});
		});
	});

	// with the breakpoints of VS Code itself (in the unit tests the ones of the mock)
	describe('in VS Code', () => {
		function location(fullPath: string, line: number, column = 0): vscode.Location {
			return new vscode.Location(vscode.Uri.file(fullPath), new vscode.Position(line, column));
		}

		function removeAllBreakpoints(): void {
			vscode.debug.removeBreakpoints([...vscode.debug.breakpoints]);
		}

		beforeEach(() => removeAllBreakpoints());
		afterEach(() => removeAllBreakpoints());

		it('should set breakpoints and read them back', () => {
			const breakpoints: IPersistBreakpoint[] = [
				{ filepath: fileA, lineNumber: 3 },
				{ filepath: fileB, lineNumber: 7, column: 4, enabled: false, condition: 'x > 1', hitCondition: '2', logMessage: 'x = {x}' },
			];

			Breakpoints.add(breakpoints);

			expect(Breakpoints.current()).to.deep.equal(breakpoints);
			expect(vscode.debug.breakpoints.length).to.equal(2);
		});

		it('should not add anything for an empty list', () => {
			Breakpoints.add([]);
			expect(vscode.debug.breakpoints.length).to.equal(0);
		});

		it('should only see source breakpoints in files of the workspace folder', () => {
			const outside = join(tmpdir(), 'taskmarks-elsewhere', 'c.ts');
			vscode.debug.addBreakpoints([new vscode.SourceBreakpoint(location(outside, 1)), new vscode.FunctionBreakpoint('main')]);
			Breakpoints.add([{ filepath: fileA, lineNumber: 3 }]);

			expect(Breakpoints.current()).to.deep.equal([{ filepath: fileA, lineNumber: 3 }]);
		});

		it('should replace the breakpoints of the workspace folder when another task is selected, and leave the others', () => {
			const outside = join(tmpdir(), 'taskmarks-elsewhere', 'c.ts');
			vscode.debug.addBreakpoints([new vscode.SourceBreakpoint(location(outside, 1))]);
			Breakpoints.add([{ filepath: fileA, lineNumber: 3 }]);
			Breakpoints.init(context, () => activeTaskName);

			activeTaskName = 'b';
			Breakpoints.showActiveTask();
			expect(Breakpoints.current()).to.deep.equal([]);
			expect(vscode.debug.breakpoints.length).to.equal(1);

			Breakpoints.add([{ filepath: fileB, lineNumber: 9 }]);
			activeTaskName = 'a';
			Breakpoints.showActiveTask();
			expect(Breakpoints.current()).to.deep.equal([{ filepath: fileA, lineNumber: 3 }]);
			expect(vscode.debug.breakpoints.length).to.equal(2);
		});
	});
});
