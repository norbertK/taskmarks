import * as vscode from 'vscode';
import { Helper } from './Helper';
import { PathHelper } from './PathHelper';
import { PathMark } from './types';

export class Mark implements PathMark {
	private _label: string;
	private _lineNumber: number;
	private _filepath: string;

	constructor(filepath: string, lineNumber: number, label: string) {
		this._label = label;
		this._lineNumber = lineNumber;
		this._filepath = filepath;
	}

	// built from the document on every call: the line number and the text of the line change while the file is edited
	// undefined if the file can't be read or no longer has that line
	async getQuickPickItem(): Promise<vscode.QuickPickItem | undefined> {
		try {
			const fullPath = PathHelper.getFullPath(this._filepath);
			const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fullPath));
			if (this._lineNumber < doc.lineCount) {
				return {
					label: this._label || doc.lineAt(this._lineNumber).text,
					description: this._lineNumber.toString(),
					detail: this._filepath,
				};
			}
		} catch (error: unknown) {
			const message = Helper.getErrorMessage(error);
			Helper.reportError({ message });
		}
		return undefined;
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
