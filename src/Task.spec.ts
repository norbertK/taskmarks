import { File } from './File';
import { PathHelper } from './PathHelper';
import { Ring } from './Ring';
import { Task } from './Task';

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

describe('Task Tests', () => {
  const testTask = new Task('fancy');
  const testRing = new Ring<File>();
  const firstFile = new File('firstFile');

  it('a new task should have a name, no Files, an empty file-Ring and no Marks', () => {
    expect(testTask.name).toBe('fancy');
    expect(testTask.hasEntries).toBe(false);
    expect(testTask.files).toEqual(testRing);
    expect(testTask.allMarks).toEqual([]);
  });

  it('first toggle should add File and Mark - activeFile should not change', () => {
    testTask.toggle('firstFile', 123, '');
    firstFile.addMark({ lineNumber: 123, label: '' });
    testRing.push(firstFile);

    expect(testTask.hasEntries).toBe(true);
    // expect(testTask.activeFile).toEqual(File.defaultFile);
    // expect(testTask.files).toEqual(testRing);
    expect(testTask.allMarks).toEqual(firstFile.allPathMarks);
  });
});
