import { Mark } from './Mark';

describe('Mark Tests', () => {
  const firstMark = new Mark(10);

  it('a new mark should by default be dirty', () => {
    expect(firstMark.isDirty()).toBe(true);
    expect(firstMark.lineNumber).toBe(10);
    expect(firstMark.label).toBe('');
  });

  it('dirty can be removed', () => {
    firstMark.unDirty();
    expect(firstMark.isDirty()).toBe(false);
  });

  const secondMark = new Mark(20, false, 'aLabel');
  it('defaults can be ignored', () => {
    expect(secondMark.isDirty()).toBe(false);
    expect(secondMark.lineNumber).toBe(20);
    expect(secondMark.label).toBe('aLabel');
  });
});
