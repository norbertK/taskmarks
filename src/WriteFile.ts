import {
  createWriteStream,
  existsSync,
  mkdirSync,
  unlinkSync,
  WriteStream,
} from 'fs';
import { dirname } from 'path';

export class WriteFile {
  private static _filePath: string;
  private static stream: WriteStream;

  static enabled(): boolean {
    if (this._filePath) {
      return true;
    }
    return false;
  }

  static init(filePath: string, clear = true): void {
    this._filePath = filePath;

    if (!this._filePath) {
      return;
    }
    if (!existsSync(dirname(this._filePath))) {
      mkdirSync(dirname(this._filePath));
    }
    if (existsSync(this._filePath) && clear) {
      unlinkSync(this._filePath);
    }

    this.stream = createWriteStream(this._filePath, { flags: 'a' });
  }

  static saveLine(line: string): void {
    this.stream.write(line + '\n');
  }
}
