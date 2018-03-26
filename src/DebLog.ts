import { WriteFile } from './WriteFile';

var disabled = true;

// import { debLog, debIn, debOut, backFrom } from './DebLog';
// const className = 'File';
// function ind(methodName: string, text = '') {
//   debIn(className, methodName, text);
// }
// function out(methodName: string, text = '') {
//   debOut(className, methodName, text);
// }
// function log(methodName: string, text = '') {
//   debLog(className, methodName, text);
// }
// function backFrom(count: number, methodName: string, text = '') {
//   debBackFrom(count, className, methodName, text);
// }

export class DebLog {
  private static _count = 0;
  private static _indentCounter = 0;
  private static _marker = '----------------------------------------------------------------------------------';
  private static _indenter = '+ - ';

  private static _classBlacklist: Array<string>;

  public static initLogfile(filePath: string, clear: boolean, classBlacklist: Array<string>) {
    disabled = false;
    this._classBlacklist = classBlacklist;
    WriteFile.init(filePath, clear);
    if (!clear) {
      this.writeLine(this._marker);
    }
  }

  public static backFrom(count: number, className: string, methodName: string, text: string) {
    if (disabled) {
      return;
    }
    if (!this._classBlacklist.find(cb => cb === className)) {
      let line = '#### back from ' + pad(count, 5) + ' - ' + className + ' - ' + methodName + ' - ' + text;

      console.log(line);
      this.writeLine(line);
    }
  }

  public static log(className: string, methodName: string, text: string): number {
    if (disabled) {
      return -1;
    }
    const foundInBlacklist = this._classBlacklist.find(cb => cb === className);
    if (!foundInBlacklist) {
      let line = pad(this._count++, 5) + ' - ';

      for (let index = 0; index < this._indentCounter; index++) {
        line += this._indenter;
      }
      line += className + ' - ' + methodName + ' - ' + text;

      console.log(line);
      this.writeLine(line);
    }
    return this._count;
  }

  public static writeLine(line: string) {
    if (disabled) {
      return;
    }
    if (WriteFile.enabled) {
      WriteFile.saveLine(line);
    }
  }

  public static indent() {
    if (disabled) {
      return;
    }
    this._indentCounter++;
  }

  public static outdent() {
    if (disabled) {
      return;
    }
    this._indentCounter--;
    if (this._indentCounter < 0) {
      this._indentCounter = 0;
    }
  }
}

export function debIn(className: string, methodName: string, text: string): number {
  if (disabled) {
    return -1;
  }
  const count = DebLog.log(className, methodName, text);
  DebLog.indent();
  return count;
}

export function debOut(className: string, methodName: string, text: string) {
  if (disabled) {
    return;
  }
  DebLog.outdent();
}

export function debLog(className: string, methodName: string, text: string): number {
  if (disabled) {
    return -1;
  }
  return DebLog.log(className, methodName, text);
}

export function debBackFrom(count: number, className: string, methodName: string, text: string) {
  if (disabled) {
    return;
  }
  DebLog.backFrom(count, className, methodName, text);
}

function pad(num: number, size: number): string {
  var s = '00000' + num;
  return s.substr(s.length - size);
}
