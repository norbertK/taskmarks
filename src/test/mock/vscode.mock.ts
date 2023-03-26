import * as sinon from 'sinon';

const mockUri = {
  file: sinon.fake(() => {
    return {
      toString: sinon.fake.returns('file:///path/to/document.txt'),
      scheme: 'file',
      path: '/path/to/document.txt',
    };
  }),
};

export const vscode = {
  commands: {
    registerCommand: sinon.fake(),
    executeCommand: sinon.fake(),
  },
  workspace: {
    onDidChangeWorkspaceFolders: sinon.fake(),
    getConfiguration: sinon.fake(),
    openTextDocument: sinon.fake.resolves({}),
    workspaceFolders: [],
  },
  window: {
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

  // eslint-disable-next-line @typescript-eslint/naming-convention
  Uri: mockUri as any,
};
