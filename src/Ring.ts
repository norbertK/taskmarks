'use strict';

// import { DebLog } from './DebLog';
// not a 'real' ring class - only stuff I need
export class Ring<T> extends Array<T | undefined> {
  private _current = -1;

  get current(): T | undefined {
    if (this._current === -1) {
      return undefined;
    }
    return this[this._current];
  }

  get next(): T | undefined {
    this._current++;
    this.checkPosition();
    return this.current;
  }

  get previous(): T | undefined {
    this._current--;
    this.checkPosition();
    return this.current;
  }

  get top(): T | undefined {
    this._current = 0;
    return this.current;
  }

  get bottom(): T | undefined {
    this._current = this.length - 1;
    return this.current;
  }

  private checkPosition() {
    if (this._current === -1) {
      this._current = this.length - 1;
    } else {
      if (this._current === this.length) {
        this._current = 0;
      }
    }
  }

  insertBefore(item: T): T | undefined {
    super.splice(this._current, 0, item);
    return this.current;
  }

  insertAfter(item: T): T | undefined {
    this._current++;
    super.splice(this._current, 0, item);
    return this.current;
  }

  pushA(items: T[]): number {
    super.push(...items);
    this._current = this.length - 1;
    return items.length;
  }

  push(item: T): number {
    super.push(item);
    this._current = this.length - 1;
    return 1;
  }

  deleteCurrent(): T | undefined {
    super.splice(this._current, 1)[0];
    this.checkPosition();
    const current = this.current;
    return current;
  }
}
