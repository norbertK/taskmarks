import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';

import assert = require('assert');
// import * as vscode from 'vscode';
import { Mark } from '../../Mark';
import * as sinon from 'sinon';
import { vscode } from '../mock/vscode.mock';

suite('Mark', () => {
	test('Constructor', () => {
		const filepath = 'src/test.ts';
		const lineNumber = 5;
		const label = 'My mark';
		const mark = new Mark(filepath, lineNumber, label);
		assert.strictEqual(mark.filepath, filepath);
		assert.strictEqual(mark.lineNumber, lineNumber);
		assert.strictEqual(mark.label, label);
	});

	it('should call myFunction once', () => {
		const myFunction = sinon.spy();
		myFunction();
		sinon.assert.calledOnce(myFunction);
	});

	// todo
	// test('setQuickPickItem', async () => {
	// 	const filepath = 'src/test.ts';
	// 	const lineNumber = 5;
	// 	const label = 'My mark';
	// 	const mark = new Mark(filepath, lineNumber, label);
	// 	// await mark.setQuickPickItem(filepath, lineNumber, label);
	// 	assert.strictEqual(mark.quickPickItem?.label, label);
	// 	assert.strictEqual(mark.quickPickItem?.detail, `${filepath}:${lineNumber}`);
	// 	assert.strictEqual(mark.quickPickItem?.description, '');
	// });
});

describe('My Extension', () => {
	it('should do something', async () => {
		// Use the fake vscode methods here
		vscode.commands.executeCommand('myCommand');
		expect(vscode.window.showInformationMessage.calledWith('Hello, World!'));
	});

	test('Test something that requires vscode', async () => {
		// Create a mock of the workspace module
		const mockWorkspace = {
			openTextDocument: async (path: string) => {
				const text = 'Hello, World!';
				return {
					getText: () => text,
					lineCount: text.split('\n').length,
					uri: vscode.Uri.file(path),
				};
			},
		};
		// mockVscode.workspace = mockWorkspace as any;

		// Call your extension function that requires vscode.workspace.openTextDocument
		const doc = await mockWorkspace.openTextDocument('/path/to/document.txt');

		// Make your assertions
		assert.equal(doc.lineCount, 1);
		assert.equal(doc.getText(), 'Hello, World!');
		// assert.equal(doc.uri, '/path/to/document.txt');
	});
});
