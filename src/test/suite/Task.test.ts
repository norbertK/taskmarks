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

function fileWithMark(filePath: string, lineNumber: number, label = ''): File {
	const file = new File(filePath);
	file.addMark({ lineNumber, label });
	return file;
}

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
		it('should return an empty array if no files have been added', () => {
			const task = new Task('MyTask');
			expect(task.files.length).to.equal(0);
		});

		it('should return an array containing all added files', () => {
			const task = new Task('MyTask');
			const file1 = fileWithMark('file1.txt', 1);
			const file2 = fileWithMark('file2.txt', 2);
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
			const hasMarks = task.hasMarks;
			expect(hasMarks).to.be.true;
			const file = task.getFile('file1.txt');
			expect(file?.hasMark(1)).to.be.true;
		});

		it('should add a mark to an existing file', () => {
			const task = new Task('MyTask');
			const file1 = fileWithMark('file1.txt', 1);
			task.files.push(file1);
			task.toggle('file1.txt', 2, 'label2');
			const hasMarks = task.hasMarks;
			expect(hasMarks).to.be.true;
			expect(file1.hasMark(2)).to.be.true;
		});

		it('should put the mark on the active file and add that file to the task', () => {
			const task = new Task('MyTask');
			const active = task.use('file1.txt');
			task.toggle('file1.txt', 1, '');
			expect(task.files).to.deep.equal([active]);
			expect(task.activeFile).to.equal(active);
		});

		it('should remove the file with its last mark, but keep it as the active file', () => {
			const task = new Task('MyTask');
			const active = task.use('file1.txt');
			task.toggle('file1.txt', 1, '');
			task.toggle('file1.txt', 1, '');
			expect(task.files.length).to.equal(0);
			expect(task.activeFile).to.equal(active);
		});

		it('should keep the order of the files when a mark is toggled off and on again', () => {
			const task = new Task('MyTask');
			task.toggle('file1.txt', 1, '');
			task.toggle('file1.txt', 5, '');
			task.toggle('file2.txt', 1, '');
			task.toggle('file1.txt', 1, '');
			task.toggle('file1.txt', 1, '');
			expect(task.files.map((file) => file.filepath)).to.deep.equal(['file1.txt', 'file2.txt']);
		});

		it('should order the files by their first mark, not by when they were opened', () => {
			const task = new Task('MyTask');
			task.use('file1.txt');
			task.use('file2.txt');
			task.toggle('file2.txt', 1, '');
			task.toggle('file1.txt', 1, '');
			expect(task.files.map((file) => file.filepath)).to.deep.equal(['file2.txt', 'file1.txt']);
		});

		it('should remove a mark if it already exists', () => {
			const task = new Task('MyTask');
			const file1 = fileWithMark('file1.txt', 1, 'label1');
			task.files.push(file1);
			task.toggle('file1.txt', 1, 'label1');
			const hasMarks = task.hasMarks;
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
			task.toggle('/path/to/file1', 1, '');
			const file1 = task.getFile('/path/to/file1');
			task.use('/path/to/file2');
			const file1Again = task.use('/path/to/file1');

			expect(file1Again).to.equal(file1);
		});

		it('should not add a file without marks to the task', function () {
			const task = new Task('Test Task');
			task.use('/path/to/file1');

			expect(task.files.length).to.equal(0);
		});

		it('should return the same file while it stays active', function () {
			const task = new Task('Test Task');
			const file1 = task.use('/path/to/file1');

			expect(task.use('/path/to/file1')).to.equal(file1);
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

	describe('#syncFile()', () => {
		it('should remove a file whose marks were all removed from outside', () => {
			const task = new Task('MyTask');
			task.toggle('file1.txt', 1, '');
			const file = task.getFile('file1.txt')!;
			file.removeMarks([...file.marks]);
			task.syncFile(file);
			expect(task.files.length).to.equal(0);
		});

		it('should add a file that got marks from outside', () => {
			const task = new Task('MyTask');
			const active = task.use('file1.txt');
			active.addMark({ lineNumber: 3, label: '' });
			task.syncFile(active);
			expect(task.files).to.deep.equal([active]);
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
			task.toggle('/path/to/file1', 1, '');
			task.toggle('/path/to/file2', 2, '');
			task.toggle('/path/to/file3', 3, '');
			const getFile2 = task.getFile('/path/to/file2');

			expect(getFile2?.filepath).to.equal('/path/to/file2');
			expect(getFile2?.hasMark(2)).to.be.true;
		});
	});

	describe('#name setter', () => {
		it('should allow changing the task name', () => {
			const task = new Task('original');
			task.name = 'renamed';
			expect(task.name).to.equal('renamed');
		});
	});

	describe('#hasMarks', () => {
		it('should return false for a new task', () => {
			const task = new Task('Test');
			expect(task.hasMarks).to.be.false;
		});

		it('should return true when a file has marks', () => {
			const task = new Task('Test');
			task.toggle('file.ts', 10, 'label');
			expect(task.hasMarks).to.be.true;
		});

		it('should return false when all marks are removed', () => {
			const task = new Task('Test');
			task.toggle('file.ts', 10, 'label');
			task.toggle('file.ts', 10, '');
			expect(task.hasMarks).to.be.false;
		});
	});

	describe('#lineHasMark', () => {
		it('should return false for non-existent file', () => {
			const task = new Task('Test');
			expect(task.lineHasMark('nonexistent.ts', 10)).to.be.false;
		});

		it('should return false for line without mark', () => {
			const task = new Task('Test');
			task.toggle('file.ts', 10, 'label');
			expect(task.lineHasMark('file.ts', 20)).to.be.false;
		});

		it('should return true for line with mark', () => {
			const task = new Task('Test');
			task.toggle('file.ts', 10, 'label');
			expect(task.lineHasMark('file.ts', 10)).to.be.true;
		});
	});

	describe('#sharedBreakpoints', () => {
		it('should have none at the start', () => {
			expect(new Task('Test').sharedBreakpoints).to.deep.equal([]);
		});

		it('should take over the shared breakpoints of a merged task that it does not have yet', () => {
			const task = new Task('Test');
			task.sharedBreakpoints = [{ filepath: '/a.ts', lineNumber: 3, condition: 'mine' }];

			task.mergeFilesWithPersistFiles({
				name: 'Test',
				persistFiles: [],
				persistBreakpoints: [
					{ filepath: '/a.ts', lineNumber: 3, condition: 'theirs' },
					{ filepath: '/a.ts', lineNumber: 8 },
				],
			});

			expect(task.sharedBreakpoints).to.deep.equal([
				{ filepath: '/a.ts', lineNumber: 3, condition: 'mine' },
				{ filepath: '/a.ts', lineNumber: 8 },
			]);
		});

		it('should keep its shared breakpoints when the merged task has none', () => {
			const task = new Task('Test');
			task.sharedBreakpoints = [{ filepath: '/a.ts', lineNumber: 3 }];
			task.mergeFilesWithPersistFiles({ name: 'Test', persistFiles: [] });
			expect(task.sharedBreakpoints).to.deep.equal([{ filepath: '/a.ts', lineNumber: 3 }]);
		});
	});

	describe('#mergeFilesWithPersistFiles', () => {
		it('should handle undefined persistTask', () => {
			const task = new Task('Test');
			task.mergeFilesWithPersistFiles(undefined as any);
			expect(task.files.length).to.equal(0);
		});

		it('should handle persistTask with undefined persistFiles', () => {
			const task = new Task('Test');
			task.mergeFilesWithPersistFiles({ name: 'test', persistFiles: undefined } as any);
			expect(task.files.length).to.equal(0);
		});

		it('should merge new files from persistTask', () => {
			const task = new Task('Test');
			const persistTask = {
				name: 'Test',
				persistFiles: [
					{
						filepath: '/file1.ts',
						persistMarks: [
							{ lineNumber: 10, label: 'mark1' },
							{ lineNumber: 20, label: 'mark2' },
						],
					},
				],
			};
			task.mergeFilesWithPersistFiles(persistTask);
			expect(task.files.length).to.equal(1);
			expect(task.getFile('/file1.ts')?.marks.length).to.equal(2);
		});

		it('should merge marks into existing files', () => {
			const task = new Task('Test');
			task.toggle('/file1.ts', 5, 'existing');

			const persistTask = {
				name: 'Test',
				persistFiles: [
					{
						filepath: '/file1.ts',
						persistMarks: [{ lineNumber: 10, label: 'new' }],
					},
				],
			};
			task.mergeFilesWithPersistFiles(persistTask);
			expect(task.files.length).to.equal(1);
			expect(task.getFile('/file1.ts')?.marks.length).to.equal(2);
		});

		it('should merge into the active file, so the active editor sees the marks', () => {
			const task = new Task('Test');
			const active = task.use('/file1.ts');
			task.mergeFilesWithPersistFiles({ name: 'Test', persistFiles: [{ filepath: '/file1.ts', persistMarks: [{ lineNumber: 10, label: '' }] }] });
			expect(task.files).to.deep.equal([active]);
			expect(active.hasMark(10)).to.be.true;
		});

		it('should not add files without marks', () => {
			const task = new Task('Test');
			const persistTask = {
				name: 'Test',
				persistFiles: [
					{
						filepath: '/file1.ts',
						persistMarks: [],
					},
				],
			};
			task.mergeFilesWithPersistFiles(persistTask);
			expect(task.files.length).to.equal(0);
		});
	});
});
