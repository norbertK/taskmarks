import * as assert from 'assert';
import * as vscode from 'vscode';
import { TaskManager } from './TaskManager';

suite('TaskManager Test Suite', () => {
  vscode.window.showInformationMessage('Start TaskManager tests.');

  test('TaskManager tests', () => {
    console.log('Init TaskManager');
    const taskManager = TaskManager.instance;

    let current = testRing.current;
    assert.strictEqual(undefined, current);

    assert.strictEqual(1, testRing.push('zero'));
    assert.strictEqual(2, testRing.pushA(['one', 'two']));
    assert.strictEqual(1, testRing.push('three'));

    current = testRing.current;
    assert.strictEqual('three', current);

    console.log('next');
    current = testRing.next;
    assert.strictEqual('zero', current);

    console.log('insert');
    testRing.insertBefore('before zero');
    assert.strictEqual(5, testRing.length);
    current = testRing.current;
    assert.strictEqual('before zero', current);

    current = testRing.next;
    assert.strictEqual('zero', current);

    testRing.insertAfter('after zero');
    assert.strictEqual(6, testRing.length);
    current = testRing.current;
    assert.strictEqual('after zero', current);

    console.log('previous');
    current = testRing.previous;
    assert.strictEqual('zero', current);

    console.log('push out of order');
    testRing.push('four');
    assert.strictEqual(7, testRing.length);
    current = testRing.current;
    assert.strictEqual('four', current);

    current = testRing.previous;
    assert.strictEqual('three', current);

    console.log('delete');
    current = testRing.deleteCurrent();
    assert.strictEqual('four', current);
    current = testRing.previous;
    assert.strictEqual('two', current);

    console.log('top && delete');
    current = testRing.top;
    assert.strictEqual('before zero', current);
    current = testRing.deleteCurrent();
    assert.strictEqual('zero', current);

    console.log('bottom && delete');
    current = testRing.bottom;
    assert.strictEqual('four', current);
    current = testRing.deleteCurrent();
    assert.strictEqual('zero', current);
  });
});
