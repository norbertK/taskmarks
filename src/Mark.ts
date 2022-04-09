export class Mark {
  private _isDirty: boolean;
  private _label = '';
  private _lineNumber = -1;

  constructor(lineNumber: number, dirty = true, label = '') {
    this._isDirty = dirty;
    this._label = label;
    this._lineNumber = lineNumber;
  }

  isDirty(): boolean {
    return this._isDirty;
  }

  get label(): string {
    return this._label;
  }

  get lineNumber(): number {
    return this._lineNumber;
  }

  set lineNumber(lineNumber: number) {
    this._isDirty = true;
    this._lineNumber = lineNumber;
  }

  unDirty() {
    if (this._isDirty) {
      this._isDirty = false;
    }
  }
}
