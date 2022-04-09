import { File } from './File';
import { mockFunction } from './JestHelpers';
import { Mark } from './Mark';
import { PathHelper } from './PathHelper';
import { Ring } from './Ring';
import { Task } from './Task';

// jest.mock('./PathHelper');

describe('Task Tests', () => {
  const testTask = new Task('fancy');
  const testRing = new Ring<File>();
  const firstFile = new File('firstFile');

  it('a new task should have a name, no activeFile, an empty file-Ring and no Marks', () => {
    expect(testTask.name).toBe('fancy');
    expect(testTask.activeFile).toBe(undefined);
    expect(testTask.files).toEqual(testRing);
    expect(testTask.allMarks).toEqual([]);
  });

  it('first toggle should add File and Mark - activeFile should not change', () => {
    const pathHelperGetFullPath = jest.fn().mockReturnValue('worked');
    PathHelper.getFullPath = pathHelperGetFullPath;

    testTask.toggle('firstFile', 123);
    firstFile.addMark(123);
    testRing.push(firstFile);

    expect(testTask.activeFile).toEqual(undefined);
    // expect(testTask.files).toEqual(testRing);
    expect(testTask.allMarks).toEqual(firstFile.allMarks);
  });
});
