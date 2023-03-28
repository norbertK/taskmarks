/* eslint-disable @typescript-eslint/naming-convention */
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
  Range: sinon.fake(),
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
    getConfiguration: sinon.fake(),
    onDidChangeWorkspaceFolders: sinon.fake(),
    onDidSaveTextDocument: sinon.fake(),
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
    onDidChangeActiveTextEditor: sinon.fake(),
    showQuickPick: sinon.fake(),
    showInputBox: sinon.fake(),
  },
};
