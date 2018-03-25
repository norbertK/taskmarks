export interface IDictionary<Key, Value> {
  getKeys(): Key[];
  getValues(): Value[];
  get(key: Key): Value;
  put(key: Key, val: Value): void;
  delete(key: Key): void;
}

export class Dictionary<Key extends string, Value> implements IDictionary<Key, Value> {
  private _internalDict: Partial<Record<Key, Value>>;
  private _length: number ;

  constructor() {
    this._internalDict = {};
    this._length=0;
  }

  public getKeys(): Key[] {
    let keys: Key[] = [];
    for (let key in this._internalDict) {
      if (this._internalDict[key] !== undefined) {
        keys.push(key);
      }
    }

    return keys;
  }

  public getValues(): Value[] {
    let vals: Value[] = [];

    for (let key in this._internalDict) {
      if (this._internalDict[key] !== undefined) {
        vals.push(this._internalDict[key]);
      }
    }

    return vals;
  }

  public get(key: Key): Value {
    return this._internalDict[key];
  }

  public put(key: Key, val: Value): void {
    if (this._internalDict[key] === undefined) {
      this._length++;
    }
  this._internalDict[key] = val;
  }

  public delete(key: Key): void {
    if (this._internalDict[key] !== undefined) {
      this._length--;
    }
    this._internalDict[key] = undefined;
  }
}
