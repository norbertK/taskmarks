import { Ring } from './Ring';

// makes only sense, if executed one after the other (and all of them)
describe('Ring Tests', () => {
  const testRing = new Ring<string>();

  it('Ring should be empty', () => {
    expect(testRing.empty).toBe(true);
  });

  it('push should return the number of inserted elements', () => {
    expect(testRing.push('zero')).toBe(1);
    expect(testRing.pushArray(['one', 'two'])).toBe(2);
    expect(testRing.push('three')).toBe(1);
  });

  it('Ring.current should return the current element (in this case, last inserted)', () => {
    expect(testRing.current).toBe('three');
  });

  it('Ring.next should return the next element (in this case, the first)', () => {
    expect(testRing.next).toBe('zero');
  });

  it('Ring.insertBefore(element) should return element', () => {
    expect(testRing.insertBefore('before zero')).toBe('before zero');
  });

  it('Ring.length should now be 5', () => {
    expect(testRing.length).toBe(5);
  });

  it('Ring.current should return the current element', () => {
    expect(testRing.current).toBe('before zero');
  });

  it('Ring.next should return the next element', () => {
    expect(testRing.next).toBe('zero');
  });

  it('Ring.insertAfter(element) should return element', () => {
    expect(testRing.insertAfter('after zero')).toBe('after zero');
  });

  it('Ring.length should now be 6', () => {
    expect(testRing.length).toBe(6);
  });

  it('Ring.current should return the current element', () => {
    expect(testRing.current).toBe('after zero');
  });

  it('Ring.next should return the next element', () => {
    expect(testRing.next).toBe('one');
  });

  it('Ring.previous should return the previous element', () => {
    expect(testRing.previous).toBe('after zero');
  });

  it('Ring.previous should return the previous element (in thiS case, the last element)', () => {
    expect(testRing.previous).toBe('zero');
  });

  it('Ring.previous should return the previous element (in thiS case, the last element)', () => {
    expect(testRing.previous).toBe('before zero');
  });

  it('Ring.previous should return the previous element', () => {
    expect(testRing.previous).toBe('three');
  });

  it('Ring.push(element) should insert element "at the end of the ring :-)" and return the number of inserted elements', () => {
    expect(testRing.push('four')).toBe(1);
    expect(testRing.length).toBe(7);
  });

  it('Ring.deleteCurrent() should delete the current element, move "current" to the next element and return this', () => {
    expect(testRing.current).toBe('four');
    expect(testRing.deleteCurrent()).toBe('before zero');
    expect(testRing.current).toBe('before zero');
    expect(testRing.length).toBe(6);
    expect(testRing.previous).toBe('three');
  });

  it('Ring.top should return the "first" element and move "current" there', () => {
    expect(testRing.top).toBe('before zero');
    expect(testRing.current).toBe('before zero');
  });

  it('Ring.bottom should return the "last" element and move "current" there', () => {
    expect(testRing.bottom).toBe('three');
    expect(testRing.current).toBe('three');
  });
});
