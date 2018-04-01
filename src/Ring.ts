'use strict';

// import { DebLog } from './DebLog';

// not a 'real' ring class - only stuff I need
export class Ring<T> extends Array<T> {
  private _current: number = 0;

  public get current(): T {
    return this[this._current];
  }

  public get next(): T {
    this._current++;
    if (this._current === this.length) {
      this._current = 0;
    }
    return this.current;
  }

  public get previous(): T {
    this._current--;
    if (this._current === -1) {
      this._current = this.length - 1;
    }
    return this.current;
  }

  public insert(...items: T[]): T {
    super.splice(this._current, 0, ...items);
    this._current += items.length;
    return this.current;
  }

  push(...items: T[]): number {
    super.push(...items);
    this._current = super.length - 1;
    return items.length;
  }
}
