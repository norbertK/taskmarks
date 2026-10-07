import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';

import assert = require('assert');
import { Mark } from '../../Mark';
import * as sinon from 'sinon';
import { vscode } from '../mock/vscode.mock';

describe('Mark', () => {
	it('Constructor', () => {
		const filepath = 'src/test.ts';
		const lineNumber = 5;
		const label = 'My mark';
		const mark = new Mark(filepath, lineNumber, label);
		assert.strictEqual(mark.filepath, filepath);
		assert.strictEqual(mark.lineNumber, lineNumber);
		assert.strictEqual(mark.label, label);
	});

	it('should allow setting lineNumber', () => {
		const mark = new Mark('test.ts', 10, 'label');
		mark.lineNumber = 20;
		expect(mark.lineNumber).to.equal(20);
	});

	it('should return undefined quickPickItem before initialization', () => {
		const mark = new Mark('test.ts', 10, 'label');
		expect(mark.quickPickItem).to.be.undefined;
	});

	it('should call myFunction once', () => {
		const myFunction = sinon.spy();
		myFunction();
		sinon.assert.calledOnce(myFunction);
	});

	describe('getQuickPickItem', () => {
		let lines: string[];

		function fakeDocument() {
			return { lineCount: lines.length, lineAt: (line: number) => ({ text: lines[line] }) };
		}

		beforeEach(() => {
			lines = ['zero', 'one', 'two', 'three'];
			sinon.replace(vscode.workspace, 'openTextDocument', sinon.fake(() => Promise.resolve(fakeDocument())) as any);
		});

		afterEach(() => {
			sinon.restore();
		});

		it('should show the text of the marked line, its line number and the file', async () => {
			const mark = new Mark('/src/a.ts', 1, '');
			expect(await mark.getQuickPickItem()).to.deep.equal({ label: 'one', description: '1', detail: '/src/a.ts' });
		});

		it('should show the label instead of the line text if there is one', async () => {
			const mark = new Mark('/src/a.ts', 1, 'look here');
			expect((await mark.getQuickPickItem())?.label).to.equal('look here');
		});

		it('should show the new line number and text after the mark has moved', async () => {
			const mark = new Mark('/src/a.ts', 1, '');
			await mark.getQuickPickItem();

			mark.lineNumber = 3;

			expect(await mark.getQuickPickItem()).to.deep.equal({ label: 'three', description: '3', detail: '/src/a.ts' });
		});

		it('should show the new text after the marked line was edited', async () => {
			const mark = new Mark('/src/a.ts', 1, '');
			await mark.getQuickPickItem();

			lines[1] = 'one, edited';

			expect((await mark.getQuickPickItem())?.label).to.equal('one, edited');
		});

		it('should try again after the file could not be read', async () => {
			sinon.restore();
			sinon.replace(vscode.workspace, 'openTextDocument', sinon.fake(() => Promise.reject(new Error('file not found'))) as any);
			const mark = new Mark('/src/a.ts', 1, '');
			expect(await mark.getQuickPickItem()).to.be.undefined;

			sinon.restore();
			sinon.replace(vscode.workspace, 'openTextDocument', sinon.fake(() => Promise.resolve(fakeDocument())) as any);

			expect((await mark.getQuickPickItem())?.label).to.equal('one');
		});
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

	it('Test something that requires vscode', async () => {
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
