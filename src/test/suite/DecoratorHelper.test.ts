import * as vscode from 'vscode';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { DecoratorHelper } from '../../DecoratorHelper';
import { PathHelper } from '../../PathHelper';

describe('DecoratorHelper', () => {
	let previousBasePath: string;

	function fakeEditor() {
		return { selection: undefined as unknown, revealRange: sinon.fake(), setDecorations: sinon.fake() };
	}

	beforeEach(() => {
		previousBasePath = PathHelper.basePath;
		PathHelper.basePath = '/workspace';
	});

	afterEach(() => {
		sinon.restore();
		PathHelper.basePath = previousBasePath;
	});

	describe('refresh', () => {
		it('should set one decoration per marked line', () => {
			const editor = fakeEditor();
			DecoratorHelper.refresh(editor as unknown as vscode.TextEditor, [3, 9]);
			expect(editor.setDecorations.calledOnce).to.be.true;
			expect(editor.setDecorations.firstCall.args[1].length).to.equal(2);
		});

		it('should remove all decorations for an empty list', () => {
			const editor = fakeEditor();
			DecoratorHelper.refresh(editor as unknown as vscode.TextEditor, []);
			expect(editor.setDecorations.firstCall.args[1]).to.deep.equal([]);
		});
	});

	describe('showLine', () => {
		it('should put the cursor on the line of the given editor and scroll there', () => {
			const editor = fakeEditor();
			DecoratorHelper.showLine(7, editor as unknown as vscode.TextEditor);
			expect(editor.selection).to.not.be.undefined;
			expect(editor.revealRange.calledOnce).to.be.true;
		});

		it('should use the active editor if none is given', () => {
			const editor = fakeEditor();
			sinon.stub(vscode.window, 'activeTextEditor').get(() => editor);
			DecoratorHelper.showLine(7);
			expect(editor.revealRange.calledOnce).to.be.true;
		});

		it('should do nothing without an editor', () => {
			sinon.stub(vscode.window, 'activeTextEditor').get(() => undefined);
			expect(() => DecoratorHelper.showLine(7)).to.not.throw();
		});
	});

	describe('openAndShow', () => {
		it('should open the file and show the line in the editor that was opened for it', async () => {
			const document = {};
			const openedEditor = fakeEditor();
			const editorThatWasActiveBefore = fakeEditor();
			sinon.stub(vscode.window, 'activeTextEditor').get(() => editorThatWasActiveBefore);
			const openTextDocument = sinon.fake.resolves(document);
			sinon.replace(vscode.workspace, 'openTextDocument', openTextDocument as any);
			const showTextDocument = sinon.fake.resolves(openedEditor);
			sinon.replace(vscode.window, 'showTextDocument', showTextDocument as any);

			await DecoratorHelper.openAndShow('/src/a.ts', 7);

			expect(openTextDocument.calledOnceWithExactly('/workspace/src/a.ts')).to.be.true;
			expect(showTextDocument.calledOnceWithExactly(document)).to.be.true;
			expect(openedEditor.revealRange.calledOnce).to.be.true;
			expect(editorThatWasActiveBefore.revealRange.called).to.be.false;
		});

		it('should tell the user when the file can not be opened, and not throw', async () => {
			sinon.replace(vscode.workspace, 'openTextDocument', sinon.fake.rejects(new Error('file is locked')) as any);
			const showWarningMessage = sinon.fake();
			sinon.replace(vscode.window, 'showWarningMessage', showWarningMessage as any);

			await DecoratorHelper.openAndShow('/src/a.ts', 7);

			expect(showWarningMessage.calledOnceWithExactly('Taskmarks: /src/a.ts could not be opened (file is locked).')).to.be.true;
		});
	});
});
