import { after } from 'mocha';

import * as vscode from 'vscode';
// import * as myExtension from '../extension';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  after(() => {
    vscode.window.showInformationMessage('All tests done!');
  });
});
