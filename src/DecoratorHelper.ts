import * as vscode from 'vscode';
import { PathHelper } from './PathHelper';
import { labelRepeatsLine } from './core/labels';
import type { IPersistMark } from './types';

export abstract class DecoratorHelper {
	private static _vscTextEditorDecorationType: vscode.TextEditorDecorationType;

	static initDecorator(context: vscode.ExtensionContext): void {
		this._vscTextEditorDecorationType = vscode.window.createTextEditorDecorationType({
			gutterIconPath: context.asAbsolutePath('images/bookmark.svg'),
			overviewRulerLane: vscode.OverviewRulerLane.Full,
			overviewRulerColor: 'rgba(196, 196, 0, 0.8)',
		});
		context.subscriptions.push(this._vscTextEditorDecorationType);
	}

	// The gutter icon for every mark and, with showLabels, the label of a mark as faded text behind its line.
	// Not a label that the line contains anyway, like the name of the method that was offered as label.
	static refresh(editor: vscode.TextEditor, marks: IPersistMark[], showLabels: boolean): void {
		const document = editor.document;
		const decorations: vscode.DecorationOptions[] = marks.map(({ lineNumber, label }) => {
			// at the end of the line (VS Code cuts the column down to the length of the line): that is where the label goes
			const range = new vscode.Range(lineNumber, Number.MAX_SAFE_INTEGER, lineNumber, Number.MAX_SAFE_INTEGER);
			// a mark may be behind the last line, if the file was changed outside of VS Code
			const lineText = lineNumber < document.lineCount ? document.lineAt(lineNumber).text : '';
			if (!showLabels || !label || labelRepeatsLine(label, lineText)) {
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
