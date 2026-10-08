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
		const marks = [
			{ lineNumber: 3, label: 'look here' },
			{ lineNumber: 9, label: '' },
		];

		function shownLabels(editor: ReturnType<typeof fakeEditor>): (string | undefined)[] {
			return editor.setDecorations.firstCall.args[1].map((decoration: vscode.DecorationOptions) => decoration.renderOptions?.after?.contentText);
		}

		it('should set one decoration per marked line', () => {
			const editor = fakeEditor();
			DecoratorHelper.refresh(editor as unknown as vscode.TextEditor, marks, true);
			expect(editor.setDecorations.calledOnce).to.be.true;
			expect(editor.setDecorations.firstCall.args[1].length).to.equal(2);
		});

		it('should show the label of a mark behind its line, nothing for a mark without label', () => {
			const editor = fakeEditor();
			DecoratorHelper.refresh(editor as unknown as vscode.TextEditor, marks, true);
			expect(shownLabels(editor)).to.deep.equal(['look here', undefined]);
		});

		it('should show no labels when they are switched off', () => {
			const editor = fakeEditor();
			DecoratorHelper.refresh(editor as unknown as vscode.TextEditor, marks, false);
			expect(shownLabels(editor)).to.deep.equal([undefined, undefined]);
			expect(editor.setDecorations.firstCall.args[1].length).to.equal(2);
		});

		it('should remove all decorations for an empty list', () => {
			const editor = fakeEditor();
			DecoratorHelper.refresh(editor as unknown as vscode.TextEditor, [], true);
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

	describe('initDecorator', () => {
		it('should create the gutter icon from the image of the extension and register it for disposal', () => {
			const previousDecorationType = (DecoratorHelper as any)._vscTextEditorDecorationType;
			const previousLabelInputDecorationType = (DecoratorHelper as any)._labelInputDecorationType;
			const decorationType = { dispose: sinon.fake() };
			const createTextEditorDecorationType = sinon.fake.returns(decorationType);
			sinon.replace(vscode.window, 'createTextEditorDecorationType', createTextEditorDecorationType as any);
			const subscriptions: unknown[] = [];
			const context = { asAbsolutePath: (path: string) => '/extension/' + path, subscriptions } as unknown as vscode.ExtensionContext;

			DecoratorHelper.initDecorator(context);

			// one for the bookmarks, one for the line of a bookmark that is waiting for its label
			expect(createTextEditorDecorationType.calledTwice).to.be.true;
			expect(createTextEditorDecorationType.firstCall.args[0].gutterIconPath).to.equal('/extension/images/bookmark.svg');
			expect(createTextEditorDecorationType.secondCall.args[0].isWholeLine).to.be.true;
			expect(subscriptions).to.deep.equal([decorationType, decorationType]);

			const editor = fakeEditor();
			DecoratorHelper.refresh(editor as unknown as vscode.TextEditor, [{ lineNumber: 1, label: '' }], true);
			expect(editor.setDecorations.firstCall.args[0]).to.equal(decorationType);
			(DecoratorHelper as any)._vscTextEditorDecorationType = previousDecorationType;
			(DecoratorHelper as any)._labelInputDecorationType = previousLabelInputDecorationType;
		});
	});

	describe('showLabelInput / hideLabelInput', () => {
		const labelInputDecorationType = { dispose: sinon.fake() };
		let previousDecorationType: unknown;
		let editorOfFile: ReturnType<typeof fakeEditor>;
		let otherEditor: ReturnType<typeof fakeEditor>;

		function shownText(editor: ReturnType<typeof fakeEditor>): string | undefined {
			return editor.setDecorations.lastCall.args[1][0].renderOptions.after.contentText;
		}

		beforeEach(() => {
			previousDecorationType = (DecoratorHelper as any)._labelInputDecorationType;
			(DecoratorHelper as any)._labelInputDecorationType = labelInputDecorationType;
			editorOfFile = { ...fakeEditor(), document: { uri: { fsPath: '/workspace/src/a.ts' } } } as ReturnType<typeof fakeEditor>;
			otherEditor = { ...fakeEditor(), document: { uri: { fsPath: '/workspace/src/b.ts' } } } as ReturnType<typeof fakeEditor>;
			sinon.stub(vscode.window, 'visibleTextEditors').get(() => [editorOfFile, otherEditor]);
		});

		afterEach(() => {
			(DecoratorHelper as any)._labelInputDecorationType = previousDecorationType;
		});

		it('should ask for the label behind the line, as long as nothing is typed', () => {
			DecoratorHelper.showLabelInput('/workspace/src/a.ts', 7, '');
			expect(editorOfFile.setDecorations.calledOnce).to.be.true;
			expect(editorOfFile.setDecorations.firstCall.args[0]).to.equal(labelInputDecorationType);
			expect(shownText(editorOfFile)).to.equal('← label?');
		});

		it('should show behind the line what is typed', () => {
			DecoratorHelper.showLabelInput('/workspace/src/a.ts', 7, 'look here');
			expect(shownText(editorOfFile)).to.equal('← label: look here');
		});

		it('should leave the editors of other files alone', () => {
			DecoratorHelper.showLabelInput('/workspace/src/a.ts', 7, 'look here');
			expect(otherEditor.setDecorations.called).to.be.false;
		});

		it('should remove it from all visible editors', () => {
			DecoratorHelper.hideLabelInput();
			expect(editorOfFile.setDecorations.calledOnceWithExactly(labelInputDecorationType, [])).to.be.true;
			expect(otherEditor.setDecorations.calledOnceWithExactly(labelInputDecorationType, [])).to.be.true;
		});
	});
});
