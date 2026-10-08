 
import * as sinon from 'sinon';

const mockUri = {
	file: sinon.fake(() => {
		return {
			toString: sinon.fake.returns('file:///path/to/document.txt'),
			scheme: 'file',
			path: '/path/to/document.txt',
		};
	}),
	parse: sinon.fake(),
};

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
	},
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
