import fs = require('fs');
import path = require('path');

import * as _ from 'lodash';

export class WriteFile {
  private static _filePath: string;
  private static stream: fs.WriteStream;

  public static enabled(): boolean {
    if (this._filePath) {
      return true;
    }
    return false;
  }

  public static init(filePath: string, clear = true): void {
    this._filePath = filePath;

    if (!this._filePath) {
      return;
    }
    if (!fs.existsSync(path.dirname(this._filePath))) {
      fs.mkdirSync(path.dirname(this._filePath));
    }
    if (fs.existsSync(this._filePath) && clear) {
      fs.unlinkSync(this._filePath);
    }

    this.stream = fs.createWriteStream(this._filePath, { flags: 'a' });
  }

  public static saveLine(line: string): void {
    this.stream.write(line + '\n');
  }
}
