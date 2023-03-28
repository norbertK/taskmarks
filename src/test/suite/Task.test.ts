// import { File } from '../File';
// import { Mark } from '../Mark';
// import { Ring } from '../Ring';
// import { Task } from '../Task';

// beforeAll(() => {
//   jest
//     .spyOn(Mark.prototype, 'setQuickPickItem')
//     .mockImplementation((filepath: string, lineNumber: number, label: string) =>
//       Promise.resolve()
//     );
// });

// afterAll(() => {
//   jest.restoreAllMocks();
// });

// describe('Task Tests', () => {
//   const testTask = new Task('fancy');
//   const testRing = new Ring<File>();
//   const firstFile = new File('firstFile');

//   it('a new task should have a name, no Files, an empty file-Ring and no Marks', () => {
//     expect(testTask.name).toBe('fancy');
//     expect(testTask.hasEntries).toBe(false);
//     expect(testTask.files).toEqual(testRing);
//     expect(testTask.allMarks).toEqual([]);
//   });

//   it('first toggle should add File and Mark - activeFile should not change', () => {
//     testTask.toggle('firstFile', 123, '');
//     firstFile.addMark({ lineNumber: 123, label: '' });
//     testRing.push(firstFile);

//     expect(testTask.hasEntries).toBe(true);
//     // expect(testTask.activeFile).toEqual(File.defaultFile);
//     // expect(testTask.files).toEqual(testRing);
//     expect(testTask.allMarks).toEqual(firstFile.allPathMarks);
//   });
// });
import { describe, it, beforeEach, afterEach } from 'mocha';

import { expect } from 'chai';
import { Task } from '../../Task';
import { File } from '../../File';

describe('Task', () => {
  describe('constructor', () => {
    it('should create a Task object with a name', () => {
      const task = new Task('MyTask');
      expect(task.name).to.equal('MyTask');
    });
  });

  describe('#activeFile()', () => {
    it('should return undefined if no file is active', () => {
      const task = new Task('MyTask');
      expect(task.activeFile).to.be.undefined;
    });
  });

  describe('#files()', () => {
    it('should return an empty Ring if no files have been added', () => {
      const task = new Task('MyTask');
      expect(task.files.length).to.equal(0);
    });

    it('should return a Ring containing all added files', () => {
      const task = new Task('MyTask');
      const file1 = new File('file1.txt', 1);
      const file2 = new File('file2.txt', 2);
      task.files.push(file1);
      task.files.push(file2);
      expect(task.files.length).to.equal(2);
      expect(task.files).to.deep.equal([file1, file2]);
    });
  });

  describe('#toggle()', () => {
    it('should add a mark to a new file', () => {
      const task = new Task('MyTask');
      task.toggle('file1.txt', 1, 'label1');
      const hasMarks = task.hasFiles;
      expect(hasMarks).to.be.true;
      const file = task.getFile('file1.txt');
      expect(file?.hasMark(1)).to.be.true;
    });

    it('should add a mark to an existing file', () => {
      const task = new Task('MyTask');
      const file1 = new File('file1.txt', 1);
      task.files.push(file1);
      task.toggle('file1.txt', 2, 'label2');
      const hasMarks = task.hasFiles;
      expect(hasMarks).to.be.true;
      expect(file1.hasMark(2)).to.be.true;
    });

    it('should remove a mark if it already exists', () => {
      const task = new Task('MyTask');
      const file1 = new File('file1.txt', 1, 'label1');
      task.files.push(file1);
      task.toggle('file1.txt', 1, 'label1');
      const hasMarks = task.hasFiles;
      expect(hasMarks).to.be.false;
      expect(file1.hasMark(1)).to.be.false;
    });
  });

  describe('#use()', function () {
    it('should create a new file if one with the given path does not exist', function () {
      const task = new Task('Test Task');
      const file = task.use('/path/to/file');

      expect(file).to.exist;
      expect(file.filepath).to.equal('/path/to/file');
    });

    it('should return an existing file with the given path', function () {
      const task = new Task('Test Task');
      const file1 = task.use('/path/to/file1');
      const file2 = task.use('/path/to/file2');
      const file3 = task.use('/path/to/file3');
      const file1Again = task.use('/path/to/file1');

      expect(file1Again).to.equal(file1);
    });

    it('should set the active file to the file with the given path', function () {
      const task = new Task('Test Task');
      const file1 = task.use('/path/to/file1');
      const file2 = task.use('/path/to/file2');
      const file3 = task.use('/path/to/file3');
      const activeFile = task.activeFile;

      expect(activeFile).to.equal(file3);
    });
  });

  describe('#getFile()', function () {
    it('should return undefined if no file with the given path exists', function () {
      const task = new Task('Test Task');
      const file = task.getFile('/path/to/file');

      expect(file).to.be.undefined;
    });

    it('should return the file with the given path', function () {
      const task = new Task('Test Task');
      const file1 = task.use('/path/to/file1');
      const file2 = task.use('/path/to/file2');
      const file3 = task.use('/path/to/file3');
      const getFile2 = task.getFile('/path/to/file2');

      expect(getFile2).to.equal(file2);
    });
  });
});
