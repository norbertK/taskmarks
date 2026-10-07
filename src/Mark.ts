export class Mark {
	private _label: string;
	private _lineNumber: number;

	constructor(lineNumber: number, label: string) {
		this._label = label;
		this._lineNumber = lineNumber;
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
