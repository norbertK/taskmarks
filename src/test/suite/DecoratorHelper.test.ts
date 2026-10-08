import * as vscode from 'vscode';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { DecoratorHelper } from '../../DecoratorHelper';
import { PathHelper } from '../../PathHelper';

describe('DecoratorHelper', () => {
	let previousBasePath: string;

	// lines: the text of the document, by line number
	function fakeEditor(lines: string[] = []) {
		const document = { lineCount: lines.length, lineAt: (line: number) => ({ text: lines[line] }) };
		return { selection: undefined as unknown, revealRange: sinon.fake(), setDecorations: sinon.fake(), document };
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

		it('should not show a label that its line contains anyway', () => {
			const editor = fakeEditor(['class Jobs {', '\tprivate void JobSaveEventHandler(JobsConfiguration jobConfig)', '\t{', '\t\tSave();']);
			const methodMarks = [
				{ lineNumber: 1, label: 'JobSaveEventHandler' },
				{ lineNumber: 3, label: 'JobSaveEventHandler' },
			];
			DecoratorHelper.refresh(editor as unknown as vscode.TextEditor, methodMarks, true);
			expect(shownLabels(editor)).to.deep.equal([undefined, 'JobSaveEventHandler']);
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
			const decorationType = { dispose: sinon.fake() };
			const createTextEditorDecorationType = sinon.fake.returns(decorationType);
			sinon.replace(vscode.window, 'createTextEditorDecorationType', createTextEditorDecorationType as any);
			const subscriptions: unknown[] = [];
			const context = { asAbsolutePath: (path: string) => '/extension/' + path, subscriptions } as unknown as vscode.ExtensionContext;

			DecoratorHelper.initDecorator(context);

			expect(createTextEditorDecorationType.calledOnce).to.be.true;
			expect(createTextEditorDecorationType.firstCall.args[0].gutterIconPath).to.equal('/extension/images/bookmark.svg');
			expect(subscriptions).to.deep.equal([decorationType]);

			const editor = fakeEditor();
			DecoratorHelper.refresh(editor as unknown as vscode.TextEditor, [{ lineNumber: 1, label: '' }], true);
			expect(editor.setDecorations.firstCall.args[0]).to.equal(decorationType);
			(DecoratorHelper as any)._vscTextEditorDecorationType = previousDecorationType;
		});
	});
});
