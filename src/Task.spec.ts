import { File } from './File';
import { PathHelper } from './PathHelper';
import { Ring } from './Ring';
import { Task } from './Task';

// jest.mock('./PathHelper');

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
    testTask.toggle('firstFile', 123);
    firstFile.addMark(123);
    testRing.push(firstFile);

    expect(testTask.hasEntries).toBe(true);
    // expect(testTask.activeFile).toEqual(File.defaultFile);
    // expect(testTask.files).toEqual(testRing);
    expect(testTask.allMarks).toEqual(firstFile.allMarks);
  });
});
