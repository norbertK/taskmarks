import { File } from './File';
import { mockFunction } from './JestHelpers';
import { Mark } from './Mark';
import { Ring } from './Ring';
import { Task } from './Task';

// const mockedUseFooContext = useFooContext as jest.Mock<File>;
// const markMockX = mockFunction(Mark.);

describe('Task Tests', () => {
  const testTask = new Task('fancy');
  const testRing = new Ring<File>();
  const file123 = new File('firstFile');
  const parentFile = new File('parentFile');
  // const mark123 = new Mark(file123, 123);

  it('a new task should have a name, no activeFile, an empty file-Ring and no Marks', () => {
    expect(testTask.name).toBe('fancy');
    expect(testTask.activeFile).toBe(undefined);
    expect(testTask.files).toEqual(testRing);
    expect(testTask.allMarks).toEqual([]);
  });

  it('first toggle should add File and Mark - activeFile should not change', () => {
    testTask.toggle('parentFile', 123);
    new Mark(parentFile, 123);
    testRing.push(parentFile);

    expect(testTask.activeFile).toEqual(undefined);
    expect(testTask.files).toEqual(testRing);
    // expect(testTask.allMarks).toEqual([]);
  });
});
