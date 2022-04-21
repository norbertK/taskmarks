import { File } from './File';
import { Mark } from './Mark';

beforeAll(() => {
  jest
    .spyOn(Mark.prototype, 'getQuickPickItem')
    .mockImplementation((filepath: string, lineNumber: number, label: string) =>
      Promise.resolve()
    );
});

afterAll(() => {
  jest.restoreAllMocks();
});

let firstFile: File;
describe('File Tests', () => {
  beforeEach(() => {
    firstFile = new File('firstFile');
  });

  it('a new file should have a filepath and an empty number array', () => {
    expect(firstFile.filepath).toBe('firstFile');
    expect(firstFile.lineNumbers).toEqual([]);
  });

  it('after adding an array of lineNumbers (numbers), lineNumbers should return these numbers (ordered, no doubles)', () => {
    firstFile.mergeMarksAndLineNumbers([
      { lineNumber: 20, label: '' },
      { lineNumber: 30, label: '' },
      { lineNumber: 10, label: '' },
      { lineNumber: 20, label: '' },
      { lineNumber: 30, label: '' },
    ]);
    expect(firstFile.allPathMarks).toEqual([
      { filepath: 'firstFile', lineNumber: 10, label: '' },
      { filepath: 'firstFile', lineNumber: 20, label: '' },
      { filepath: 'firstFile', lineNumber: 30, label: '' },
    ]);
  });

  it('after adding a second array of lineNumbers (numbers), lineNumbers should return the combined numbers', () => {
    firstFile.mergeMarksAndLineNumbers([
      { lineNumber: 20, label: '' },
      { lineNumber: 30, label: '' },
      { lineNumber: 10, label: '' },
      { lineNumber: 20, label: '' },
      { lineNumber: 30, label: '' },
    ]);
    firstFile.mergeMarksAndLineNumbers([
      { lineNumber: 20, label: '' },
      { lineNumber: 50, label: '' },
      { lineNumber: 40, label: '' },
      { lineNumber: 50, label: '' },
    ]);
    expect(firstFile.lineNumbers).toEqual([10, 20, 30, 40, 50]);
  });

  it('after adding an existing lineNumber, nothing should change (ordered, no doubles)', () => {
    firstFile.mergeMarksAndLineNumbers([
      { lineNumber: 20, label: '' },
      { lineNumber: 30, label: '' },
      { lineNumber: 10, label: '' },
      { lineNumber: 20, label: '' },
      { lineNumber: 30, label: '' },
    ]);
    firstFile.mergeMarksAndLineNumbers([
      { lineNumber: 20, label: '' },
      { lineNumber: 50, label: '' },
      { lineNumber: 40, label: '' },
      { lineNumber: 50, label: '' },
    ]);
    firstFile.addMark({ lineNumber: 30, label: '' });
    expect(firstFile.lineNumbers).toEqual([10, 20, 30, 40, 50]);
  });

  it('after adding one new lineNumber, lineNumbers should return these numbers (ordered, no doubles)', () => {
    firstFile.mergeMarksAndLineNumbers([
      { lineNumber: 20, label: '' },
      { lineNumber: 30, label: '' },
      { lineNumber: 10, label: '' },
      { lineNumber: 20, label: '' },
      { lineNumber: 30, label: '' },
    ]);
    firstFile.mergeMarksAndLineNumbers([
      { lineNumber: 20, label: '' },
      { lineNumber: 50, label: '' },
      { lineNumber: 40, label: '' },
      { lineNumber: 50, label: '' },
    ]);
    firstFile.addMark({ lineNumber: 25, label: '' });
    expect(firstFile.lineNumbers).toEqual([10, 20, 25, 30, 40, 50]);
  });

  // ToDo NK - add tests for toggleTaskMark and hasMarks
});
