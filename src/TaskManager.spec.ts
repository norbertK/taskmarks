import { TaskManager } from './TaskManager';

import { Ring } from './Ring';

describe('Ring Tests', () => {
  const testRing = new Ring<string>();

  let current = testRing.current;

  it('current should be undefined', () => {
    expect(current).toBeUndefined();
  });

  it('push should return number of inserted elements', () => {
    expect(testRing.push('zero')).toBe(1);
    expect(testRing.pushA(['one', 'two'])).toBe(2);
    expect(testRing.push('three')).toBe(1);
  });

  it('Ring.current should return current element (in this case, last inserted)', () => {
    expect(testRing.current).toBe('three');
  });

  // console.log('next');
  // current = testRing.next;
  // assert.strictEqual('zero', current);

  // console.log('insert');
  // testRing.insertBefore('before zero');
  // assert.strictEqual(5, testRing.length);
  // current = testRing.current;
  // assert.strictEqual('before zero', current);

  // current = testRing.next;
  // assert.strictEqual('zero', current);

  // testRing.insertAfter('after zero');
  // assert.strictEqual(6, testRing.length);
  // current = testRing.current;
  // assert.strictEqual('after zero', current);

  // console.log('previous');
  // current = testRing.previous;
  // assert.strictEqual('zero', current);

  // console.log('push out of order');
  // testRing.push('four');
  // assert.strictEqual(7, testRing.length);
  // current = testRing.current;
  // assert.strictEqual('four', current);

  // current = testRing.previous;
  // assert.strictEqual('three', current);

  // console.log('delete');
  // current = testRing.deleteCurrent();
  // assert.strictEqual('four', current);
  // current = testRing.previous;
  // assert.strictEqual('two', current);

  // console.log('top && delete');
  // current = testRing.top;
  // assert.strictEqual('before zero', current);
  // current = testRing.deleteCurrent();
  // assert.strictEqual('zero', current);

  // console.log('bottom && delete');
  // current = testRing.bottom;
  // assert.strictEqual('four', current);
  // current = testRing.deleteCurrent();
  // assert.strictEqual('zero', current);
});
