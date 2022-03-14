import { existsSync } from 'fs';

export class PathHelper {
  private static _basePath: string;

  static get basePath(): string {
    return this._basePath;
  }

  static set basePath(basePath: string) {
    this._basePath = basePath;
  }

  static getFullPath(filepath: string | undefined): string | undefined {
    if (!filepath) {
      return undefined;
    }

    const pathWithBasePath = PathHelper.basePath + filepath;
    const pwbExists = existsSync(pathWithBasePath);
    if (pwbExists) {
      return pathWithBasePath;
    }
    const pExists = existsSync(filepath);
    if (pExists) {
      return filepath;
    }

    return undefined;
  }

  static reducePath(filepath: string): string {
    if (filepath.startsWith(this.basePath)) {
      filepath = filepath.substring(this._basePath.length);
    }
    return filepath;
  }
}
