export class Mark {
  private _label = '';
  private _lineNumber = -1;

  constructor(lineNumber: number, label = '') {
    this._label = label;
    this._lineNumber = lineNumber;
  }

  get label(): string {
    return this._label;
  }

  get lineNumber(): number {
    return this._lineNumber;
  }

  set lineNumber(lineNumber: number) {
    this._lineNumber = lineNumber;
  }
}
