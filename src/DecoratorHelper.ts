import * as vscode from 'vscode';
import { PathHelper } from './PathHelper';

export abstract class DecoratorHelper {
	private static _iconPath: string;
	private static _vscTextEditorDecorationType: vscode.TextEditorDecorationType;

	static get iconPath(): string {
		return this._iconPath;
	}

	static initDecorator(context: vscode.ExtensionContext): void {
		this._iconPath = context.asAbsolutePath('images/bookmark.svg');
		this._vscTextEditorDecorationType = vscode.window.createTextEditorDecorationType({
			gutterIconPath: this._iconPath,
			overviewRulerLane: vscode.OverviewRulerLane.Full,
			overviewRulerColor: 'rgba(196, 196, 0, 0.8)',
		});
		context.subscriptions.push(this._vscTextEditorDecorationType);
	}

	static refresh(editor: vscode.TextEditor, lineNumbers: number[]): void {
		const ranges = lineNumbers.map((lineNumber) => {
			return new vscode.Range(lineNumber, 0, lineNumber, 0);
		});
		editor.setDecorations(this._vscTextEditorDecorationType, ranges);
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
