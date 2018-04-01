import { WriteFile } from './WriteFile';

export class DebLog {
  private static _disabled = true;
  private static _count = 0;
  private static _indentCounter = 0;
  private static _marker = '*******************************************************************************';
  private static _indenter = '+ - ';

  private static _classBlacklist: Array<string>;

  public static initLogfile(filePath: string, clear: boolean, classBlacklist: Array<string>) {
    this._disabled = false;
    this._classBlacklist = classBlacklist;
    WriteFile.init(filePath, clear);
    if (!clear) {
      this.writeLine('');
      this.writeLine(this._marker);
      this.writeLine(this._marker);
      this.writeLine('');
    }
  }

  protected className = 'DebLog';

  public ind(methodName: string, text = '') {
    if (DebLog._disabled) {
      return;
    }
    const count = DebLog.internalLog(this.className, methodName, text);
    DebLog.indent();
    return count;
  }
  public out() {
    if (DebLog._disabled) {
      return;
    }
    DebLog.outdent();
  }

  public log(methodName: string, text = '') {
    if (DebLog._disabled) {
      return;
    }
    return DebLog.internalLog(this.className, methodName, text);
  }

  public dump(indent: number, text: string) {
    if (DebLog._disabled) {
      return;
    }
    DebLog.internalDump(this.className, indent, text);
  }

  private static internalDump(className: string, indent: number, text: string) {
    const foundInBlacklist = this._classBlacklist.find(cb => cb === className);
    if (!foundInBlacklist) {
      let line = '';
      for (let index = 0; index < indent; index++) {
        line += this._indenter;
      }
      line += text;
      console.log(line);
      this.writeLine(line);
    }
  }

  public backFrom(count: number, methodName: string, text = '') {
    if (DebLog._disabled) {
      return;
    }
    DebLog.internalBackFrom(count, this.className, methodName, text);
  }

  private static internalBackFrom(count: number, className: string, methodName: string, text: string) {
    if (!this._classBlacklist.find(cb => cb === className)) {
      let line = '#### back from ' + this.pad(count, 5) + ' - ' + className + ' - ' + methodName + ' - ' + text;

      console.log(line);
      this.writeLine(line);
    }
  }

  private static internalLog(className: string, methodName: string, text: string): number {
    const foundInBlacklist = this._classBlacklist.find(cb => cb === className);
    if (!foundInBlacklist) {
      let line = this.pad(this._count++, 5) + ' - ';

      for (let index = 0; index < this._indentCounter; index++) {
        line += this._indenter;
      }
      line += className + ' - ' + methodName + ' - ' + text;

      console.log(line);
      this.writeLine(line);
    }
    return this._count;
  }

  private static writeLine(line: string) {
    if (WriteFile.enabled) {
      WriteFile.saveLine(line);
    }
  }

  private static indent() {
    this._indentCounter++;
  }

  private static outdent() {
    this._indentCounter--;
    if (this._indentCounter < 0) {
      this._indentCounter = 0;
    }
  }

  private static pad(num: number, size: number): string {
    var s = '00000' + num;
    return s.substr(s.length - size);
  }
}
