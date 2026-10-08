 
import * as sinon from 'sinon';

const mockUri = {
	file: sinon.fake((fsPath?: string) => {
		return {
			toString: sinon.fake.returns('file:///path/to/document.txt'),
			scheme: 'file',
			path: '/path/to/document.txt',
			fsPath,
		};
	}),
	parse: sinon.fake(),
};

class Position {
	constructor(
		public line: number,
		public character: number
	) {}
}

class Location {
	range: { start: Position; end: Position };
	constructor(
		public uri: unknown,
		position: Position
	) {
		this.range = { start: position, end: position };
	}
}

class SourceBreakpoint {
	constructor(
		public location: Location,
		public enabled = true,
		public condition?: string,
		public hitCondition?: string,
		public logMessage?: string
	) {}
}

class FunctionBreakpoint {
	constructor(public functionName: string) {}
}

// the breakpoints of the window, as debug.addBreakpoints and debug.removeBreakpoints change them
const breakpoints: unknown[] = [];

export const vscode = {
	StatusBarAlignment: {},
	StatusBarItem: {
		show: sinon.fake(),
		hide: sinon.fake(),
	},
	OverviewRulerLane: {
		Left: null,
	},
	debug: {
		onDidTerminateDebugSession: sinon.fake(),
		startDebugging: sinon.fake(),
		breakpoints,
		addBreakpoints: (added: unknown[]) => {
			breakpoints.push(...added);
		},
		removeBreakpoints: (removed: unknown[]) => {
			removed.forEach((breakpoint) => breakpoints.includes(breakpoint) && breakpoints.splice(breakpoints.indexOf(breakpoint), 1));
		},
		onDidChangeBreakpoints: sinon.fake(),
	},
	Position,
	Location,
	SourceBreakpoint,
	FunctionBreakpoint,
	env: {
		clipboard: {
			readText: sinon.fake.resolves(''),
			writeText: sinon.fake.resolves(undefined),
		},
	},
	Range: sinon.fake(),
	Selection: sinon.fake(),
	QuickPickItemKind: { Separator: -1, Default: 0 },
	ThemeColor: sinon.fake(),
	TextEditorRevealType: { Default: 0, InCenter: 1, InCenterIfOutsideViewport: 2, AtTop: 3 },
	TextDocumentChangeReason: { Undo: 1, Redo: 2 },
	RelativePattern: sinon.fake(),
	Uri: mockUri as any,
	Diagnostic: sinon.fake(),
	DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
	commands: {
		registerCommand: sinon.fake(),
		executeCommand: sinon.fake(),
	},
	languages: {
		createDiagnosticCollection: sinon.fake(),
	},

	workspace: {
		workspaceFolders: [],
		getConfiguration: sinon.fake.returns({ get: sinon.fake() }),
		onDidChangeConfiguration: sinon.fake(),
		onDidChangeWorkspaceFolders: sinon.fake(),
		onDidSaveTextDocument: sinon.fake(),
		onDidChangeTextDocument: sinon.fake(),
		createFileSystemWatcher: sinon.fake(() => ({
			onDidChange: sinon.fake(),
			onDidCreate: sinon.fake(),
			onDidDelete: sinon.fake(),
			dispose: sinon.fake(),
		})),
		openTextDocument: sinon.fake.resolves({}),
	},
	window: {
		createStatusBarItem: sinon.fake(() => ({
			show: sinon.fake(),
			hide: sinon.fake(),
		})),
		createTextEditorDecorationType: sinon.fake(),
		createOutputChannel: sinon.fake(),
		showErrorMessage: sinon.fake(),
		showInformationMessage: sinon.fake(),
		showWarningMessage: sinon.fake(),
		registerWebviewPanelSerializer: sinon.fake(),
		activeTextEditor: undefined,
		visibleTextEditors: [],
		onDidChangeVisibleTextEditors: sinon.fake(),
		showTextDocument: sinon.fake.resolves(undefined),
		onDidChangeActiveTextEditor: sinon.fake(),
		showQuickPick: sinon.fake(),
		showInputBox: sinon.fake(),
	},
};
