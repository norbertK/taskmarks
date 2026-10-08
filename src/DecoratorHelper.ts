import * as vscode from 'vscode';
import { PathHelper } from './PathHelper';
import type { IPersistMark } from './types';

export abstract class DecoratorHelper {
	private static _vscTextEditorDecorationType: vscode.TextEditorDecorationType;
	private static _labelInputDecorationType: vscode.TextEditorDecorationType;

	static initDecorator(context: vscode.ExtensionContext): void {
		this._vscTextEditorDecorationType = vscode.window.createTextEditorDecorationType({
			gutterIconPath: context.asAbsolutePath('images/bookmark.svg'),
			overviewRulerLane: vscode.OverviewRulerLane.Full,
			overviewRulerColor: 'rgba(196, 196, 0, 0.8)',
		});
		// the line of a bookmark that is waiting for its label: it has to catch the eye, the input box opens far away at the top
		this._labelInputDecorationType = vscode.window.createTextEditorDecorationType({
			gutterIconPath: context.asAbsolutePath('images/bookmark.svg'),
			isWholeLine: true,
			backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
		});
		context.subscriptions.push(this._vscTextEditorDecorationType, this._labelInputDecorationType);
	}

	// While the label of a new bookmark is typed into the input box: highlights the line in every visible editor of the file
	// (full path) and shows behind it what is typed so far.
	static showLabelInput(fullName: string, lineNumber: number, typed: string): void {
		const range = new vscode.Range(lineNumber, Number.MAX_SAFE_INTEGER, lineNumber, Number.MAX_SAFE_INTEGER);
		const contentText = typed ? `← label: ${typed}` : '← label?';
		const after = { contentText, color: new vscode.ThemeColor('editorWarning.foreground'), fontWeight: 'bold', margin: '0 0 0 3em' };
		for (const editor of vscode.window.visibleTextEditors) {
			if (editor.document.uri.fsPath === fullName) {
				editor.setDecorations(this._labelInputDecorationType, [{ range, renderOptions: { after } }]);
			}
		}
	}

	static hideLabelInput(): void {
		for (const editor of vscode.window.visibleTextEditors) {
			editor.setDecorations(this._labelInputDecorationType, []);
		}
	}

	// the gutter icon for every mark and, with showLabels, the label of a mark as faded text behind its line
	static refresh(editor: vscode.TextEditor, marks: IPersistMark[], showLabels: boolean): void {
		const decorations: vscode.DecorationOptions[] = marks.map(({ lineNumber, label }) => {
			// at the end of the line (VS Code cuts the column down to the length of the line): that is where the label goes
			const range = new vscode.Range(lineNumber, Number.MAX_SAFE_INTEGER, lineNumber, Number.MAX_SAFE_INTEGER);
			if (!showLabels || !label) {
				return { range };
			}
			return {
				range,
				renderOptions: {
					after: { contentText: label, color: new vscode.ThemeColor('editorCodeLens.foreground'), fontStyle: 'italic', margin: '0 0 0 3em' },
				},
			};
		});
		editor.setDecorations(this._vscTextEditorDecorationType, decorations);
	}

	// puts the cursor on the line and scrolls it into view - in the active editor, if no other one is given
	static showLine(lineNumber: number, editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor): void {
		if (!editor) {
			return;
		}
		const selection = new vscode.Selection(lineNumber, 0, lineNumber, 0);
		editor.selection = selection;
		editor.revealRange(selection, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
	}

	// filepath is relative to the workspace folder. A file that can't be opened is told to the user, not thrown.
	static async openAndShow(filepath: string, lineNumber: number): Promise<void> {
		try {
			const textDocument = await vscode.workspace.openTextDocument(PathHelper.getFullPath(filepath));
			const editor = await vscode.window.showTextDocument(textDocument);
			this.showLine(lineNumber, editor);
		} catch (error: unknown) {
			vscode.window.showWarningMessage(`Taskmarks: ${filepath} could not be opened (${error instanceof Error ? error.message : String(error)}).`);
		}
	}
}
