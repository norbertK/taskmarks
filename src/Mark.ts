import * as vscode from 'vscode';
import { Helper } from './Helper';
import { PathHelper } from './PathHelper';
import { PathMark } from './types';

export class Mark implements PathMark {
	private _label = '';
	private _lineNumber = -1;
	private _filepath: string;

	private _quickPickItem: vscode.QuickPickItem | undefined;
	private _quickPickItemInitialized = false;

	constructor(filepath: string, lineNumber: number, label: string) {
		this._label = label;
		this._lineNumber = lineNumber;
		this._filepath = filepath;
	}

	public async getQuickPickItem(): Promise<vscode.QuickPickItem | undefined> {
		if (this._quickPickItemInitialized) {
			return this._quickPickItem;
		}
		this._quickPickItemInitialized = true;

		try {
			const fullPath = PathHelper.getFullPath(this._filepath);
			const uri = vscode.Uri.file(fullPath);
			const doc = await vscode.workspace.openTextDocument(uri);
			if (doc && this._lineNumber <= doc.lineCount) {
				const lineText = doc.lineAt(this._lineNumber).text;
				this._quickPickItem = {
					label: this._label ? this._label : lineText,
					description: this._lineNumber.toString(),
					detail: this._filepath,
				};
			}
		} catch (error: unknown) {
			const message = Helper.getErrorMessage(error);
			Helper.reportError({ message });
		}
		return this._quickPickItem;
	}

	public get quickPickItem(): vscode.QuickPickItem | undefined {
		return this._quickPickItem;
	}

	get filepath(): string {
		return this._filepath;
	}

	get label(): string {
		return this._label;
	}

	set label(label: string) {
		this._label = label;
	}

	get lineNumber(): number {
		return this._lineNumber;
	}

	set lineNumber(lineNumber: number) {
		this._lineNumber = lineNumber;
	}
}
