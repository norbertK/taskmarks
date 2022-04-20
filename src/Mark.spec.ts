import { Mark } from './Mark';

describe('Mark Tests', () => {
  it('a new mark ', () => {
    const firstMark = new Mark('a path', 10);
    expect(firstMark.filepath).toBe('a path');
    expect(firstMark.lineNumber).toBe(10);
    expect(firstMark.label).toBe('');
  });

  it('defaults can be ignored', () => {
    const secondMark = new Mark('a path', 20, 'a label');
    expect(secondMark.filepath).toBe('a path');
    expect(secondMark.lineNumber).toBe(20);
    expect(secondMark.label).toBe('a label');
  });
});
