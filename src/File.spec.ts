import { File } from './File';

describe('File Tests', () => {
  const firstFile = new File('firstFile');

  it('a new file should have a filepath and an empty number array', () => {
    expect(firstFile.filepath).toBe('firstFile');
    expect(firstFile.lineNumbers).toEqual([]);
  });

  it('after adding an array of lineNumbers (numbers), lineNumbers should return these numbers (ordered, no doubles)', () => {
    firstFile.mergeMarksAndLineNumbers([20, 30, 10, 20, 30]);
    expect(firstFile.lineNumbers).toEqual([10, 20, 30]);
  });

  it('after adding a second array of lineNumbers (numbers), lineNumbers should return the combined numbers', () => {
    firstFile.mergeMarksAndLineNumbers([20, 50, 40, 50]);
    expect(firstFile.lineNumbers).toEqual([10, 20, 30, 40, 50]);
  });

  it('after adding one new lineNumber, lineNumbers should return these numbers (ordered, no doubles)', () => {
    firstFile.addMark(30);
    expect(firstFile.lineNumbers).toEqual([10, 20, 30, 40, 50]);
    firstFile.addMark(25);
    expect(firstFile.lineNumbers).toEqual([10, 20, 25, 30, 40, 50]);
  });
});
