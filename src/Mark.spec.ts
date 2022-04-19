import { Mark } from './Mark';

describe('Mark Tests', () => {
  const firstMark = new Mark(10);

  it('a new mark ', () => {
    expect(firstMark.lineNumber).toBe(10);
    expect(firstMark.label).toBe('');
  });

  const secondMark = new Mark(20, 'aLabel');
  it('defaults can be ignored', () => {
    expect(secondMark.lineNumber).toBe(20);
    expect(secondMark.label).toBe('aLabel');
  });
});
