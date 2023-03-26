import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { Ring } from '../../Ring';

import { describe, it } from 'mocha';
import { expect } from 'chai';
// import * as myExtension from '../../extension';

describe('Ring', () => {
  describe('Ring', () => {
    it('should return undefined when current is called on an empty ring', () => {
      const ring = new Ring<number>();
      expect(ring.current).to.be.undefined;
    });

    it('should return true for empty when called on a newly created ring', () => {
      const ring = new Ring<number>();
      expect(ring.empty).to.be.true;
    });

    it('should insert an item before the current item', () => {
      const ring = new Ring<number>();
      ring.push(1);
      ring.push(2);
      ring.push(3);
      ring.top;
      ring.insertBefore(0);
      expect(ring.current).to.equal(0);
      expect(ring).to.eql([0, 1, 2, 3]);
    });

    it('should insert an item after the current item', () => {
      const ring = new Ring<number>();
      ring.push(1);
      ring.push(2);
      ring.push(3);
      ring.insertAfter(4);
      expect(ring.current).to.equal(4);
      expect(ring).to.eql([1, 2, 3, 4]);
    });

    it('should push an item onto the ring', () => {
      const ring = new Ring<number>();
      ring.push(1);
      expect(ring.current).to.equal(1);
      expect(ring).to.eql([1]);
    });

    it('should push an array of items onto the ring', () => {
      const ring = new Ring<number>();
      ring.pushArray([1, 2, 3]);
      expect(ring.current).to.equal(3);
      expect(ring).to.eql([1, 2, 3]);
    });

    it('should delete the current item', () => {
      const ring = new Ring<number>();
      ring.push(1);
      ring.push(2);
      ring.push(3);
      ring.top;
      ring.deleteCurrent();
      expect(ring.current).to.equal(2);
      expect(ring).to.eql([2, 3]);
    });
  });

  describe('constructor', () => {
    it('creates a new Ring instance', () => {
      const ring = new Ring<number>();
      expect(ring).to.be.an.instanceOf(Ring);
    });
  });

  describe('current', () => {
    it('returns undefined when the ring is empty', () => {
      const ring = new Ring<number>();
      expect(ring.current).to.be.undefined;
    });

    it('returns the current item in the ring', () => {
      const ring = new Ring<number>();
      ring.push(1);
      expect(ring.current).to.equal(1);
    });
  });

  describe('empty', () => {
    it('returns true when the ring is empty', () => {
      const ring = new Ring<number>();
      expect(ring.empty).to.be.true;
    });

    it('returns false when the ring is not empty', () => {
      const ring = new Ring<number>();
      ring.push(1);
      expect(ring.empty).to.be.false;
    });
  });

  describe('next', () => {
    it('returns undefined when the ring is empty', () => {
      const ring = new Ring<number>();
      expect(ring.next).to.be.undefined;
    });

    it('returns the next item in the ring', () => {
      const ring = new Ring<number>();
      ring.push(1);
      ring.push(2);
      expect(ring.next).to.equal(1);
    });

    it('returns the first item in the ring when at the end', () => {
      const ring = new Ring<number>();
      ring.push(1);
      ring.push(2);
      ring.bottom;
      expect(ring.next).to.equal(1);
    });
  });

  describe('previous', () => {
    it('returns undefined when the ring is empty', () => {
      const ring = new Ring<number>();
      expect(ring.previous).to.be.undefined;
    });

    it('returns the previous item in the ring', () => {
      const ring = new Ring<number>();
      ring.push(1);
      ring.push(2);
      ring.bottom;
      expect(ring.previous).to.equal(1);
    });

    it('returns the last item in the ring when at the beginning', () => {
      const ring = new Ring<number>();
      ring.push(1);
      ring.push(2);
      ring.top;
      expect(ring.previous).to.equal(2);
    });
  });

  describe('top', () => {
    it('returns undefined when the ring is empty', () => {
      const ring = new Ring<number>();
      expect(ring.top).to.be.undefined;
    });

    it('sets the current item to the first item in the ring', () => {
      const ring = new Ring<number>();
      ring.push(1);
      ring.push(2);
      ring.bottom;
      ring.top;
      expect(ring.current).to.equal(1);
    });
  });

  describe('bottom', () => {
    it('returns undefined when the ring is empty', () => {
      const ring = new Ring<number>();
      expect(ring.bottom).to.be.undefined;
    });

    it('sets the current item to the last item in the ring', () => {
      const ring = new Ring<number>();
      ring.push(1);
      ring.push(2);
      ring.top;
      ring.bottom;
      expect(ring.current).to.equal(2);
    });
  });

  const testRing = new Ring<string>();
  it('Ring should be empty', () => {
    assert.equal(testRing.empty, true);
  });

  it('current should be undefined', () => {
    assert.equal(testRing.current, undefined);
  });

  it('push should return the number of inserted elements', () => {
    assert.equal(testRing.push('zero'), 1);
    assert.equal(testRing.pushArray(['one', 'two']), 2);
    assert.equal(testRing.push('three'), 1);
  });
});