// not a 'real' ring class - only stuff I need
// current is the current item or undefined, if the ring is empty
// if a new item is inserted, it becomes the current item
// if the current item is deleted, the next item becomes the current item
// if the current item is deleted and there is no next item, the previous item becomes the current item
// if the current item is deleted and it was the last item in the ring, the ring becomes empty

export class Ring<T> extends Array<T> {
	private _current: number = -1;

	constructor(...items: T[]) {
		super(...items);
		this._current = this.length - 1;
	}

	get currentPosition(): number {
		return this._current;
	}

	set currentPosition(position: number) {
		this._current = (position + this.length) % this.length;
	}

	get current(): T {
		return this[this._current];
	}

	set current(item: T) {
		this[this._current] = item;
	}

	get empty(): boolean {
		return this._current === -1;
	}

	get next(): T | undefined {
		if (this.length === 0) {
			return undefined;
		}
		this.currentPosition = this._current + 1;
		return this.current;
	}

	get previous(): T | undefined {
		if (this.length === 0) {
			return undefined;
		}
		this.currentPosition = this._current - 1;
		return this.current;
	}

	get first(): T | undefined {
		if (this.length === 0) {
			return undefined;
		}
		this._current = 0;
		return this.current;
	}

	get last(): T | undefined {
		if (this.length === 0) {
			return undefined;
		}
		this._current = this.length - 1;
		return this.current;
	}

	insertBefore(item: T): T {
		if (this.length === 0) {
			this.push(item);
		} else {
			this.splice(this._current, 0, item);
		}
		return this.current;
	}

	insertAfter(item: T): T {
		if (this.length === 0) {
			this.push(item);
		} else {
			this.splice(this._current + 1, 0, item);
			this._current = (this._current + 1) % this.length;
		}
		return this.current;
	}

	push(...items: T[]): number {
		this._current = super.push(...items) - 1;
		return this.length;
	}

	deleteCurrent(): T | undefined {
		if (this.length === 0) {
			return undefined;
		}
		this.splice(this._current, 1);
		this._current = this._current % this.length;
		return this.current;
	}

	popCurrent(): T | undefined {
		if (this.length === 0) {
			return undefined;
		}

		const current = this.current;
		this.deleteCurrent();
		return current;
	}

	delete(key: T): boolean {
		if (this.length === 0) {
			return false;
		}

		const index = this.indexOf(key);
		if (index !== -1) {
			this.splice(index, 1);
			if (index <= this._current) {
				this.currentPosition = this._current - 1;
			}

			return true;
		}

		return false;
	}
}
