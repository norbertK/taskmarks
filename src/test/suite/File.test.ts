import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
// import { vscode } from '../mock/vscode.mock';

// import { IPersistFile, IPersistMark } from '../../types';
import { File } from '../../File';
// import { Mark } from '../../Mark';

function fileWithMark(filePath: string, lineNumber: number, label = ''): File {
	const file = new File(filePath);
	file.addMark({ lineNumber, label });
	return file;
}

describe('File', () => {
	const filePath = 'test.js';
	const lineNumber = 1;
	const label = 'test mark';
	let firstFile: File;

	beforeEach(() => {
		firstFile = fileWithMark(filePath, lineNumber, label);
	});

	describe('allPersistMarks', () => {
		it('should return an array of IPersistMark objects representing all marks in the file', () => {
			const filePath = 'example/file/path';
			const lineNumber1 = 1;
			const label1 = 'Example Label 1';
			const lineNumber2 = 5;
			const label2 = 'Example Label 2';
			const file = new File(filePath);
			file.addMark({ lineNumber: lineNumber1, label: label1 });
			file.addMark({ lineNumber: lineNumber2, label: label2 });

			const persistMarks = file.allPersistMarks;

			expect(persistMarks).to.eql([
				{ lineNumber: lineNumber1, label: label1 },
				{ lineNumber: lineNumber2, label: label2 },
			]);
		});
	});

	describe('a File', () => {
		it('should have a filepath and the line numbers of its marks', () => {
			firstFile = fileWithMark(filePath, lineNumber, label);
			expect(firstFile.filepath).to.eql('test.js');
			expect(firstFile.lineNumbers).to.eql([1]);
		});
	});

	describe('constructor', () => {
		it('should initialize with filepath and no marks', () => {
			const filePath = '/path/to/file.txt';
			const file = new File(filePath);
			expect(file.filepath).to.eql(filePath);
			expect(file.marks).to.eql([]);
		});

	});

	describe('addMark', () => {
		it('should add a new mark to the file', () => {
			const filePath = '/path/to/file.txt';
			const file = new File(filePath);
			const lineNumber = 10;
			const label = 'Test label';
			file.addMark({ lineNumber, label });
			expect(file.marks.length).to.eql(1);
			expect(file.marks[0].lineNumber).to.eql(lineNumber);
			expect(file.marks[0].label).to.eql(label);
		});
	});

	describe('hasMark', () => {
		it('should return true if a mark with the given line number exists in the file', () => {
			const filePath = '/path/to/file.txt';
			const lineNumber = 10;
			const label = 'Test label';
			const file = fileWithMark(filePath, lineNumber, label);
			expect(file.hasMark(lineNumber)).to.eql(true);
		});

		it('should return false if a mark with the given line number does not exist in the file', () => {
			const filePath = '/path/to/file.txt';
			const lineNumber = 10;
			const label = 'Test label';
			const file = fileWithMark(filePath, lineNumber, label);
			expect(file.hasMark(20)).to.eql(false);
		});
	});

	describe('toggleTaskMark', () => {
		it('should remove a mark if it already exists in the file', () => {
			const filePath = '/path/to/file.txt';
			const lineNumber = 10;
			const label = 'Test label';
			const file = fileWithMark(filePath, lineNumber, label);
			expect(file.marks.length).to.eql(1);
			file.toggleTaskMark({ lineNumber, label: '' });
			expect(file.marks).to.eql([]);
		});

		it('should add a mark if it does not exist', () => {
			const filePath = '/path/to/file.txt';
			const file = new File(filePath);
			expect(file.marks.length).to.eql(0);
			file.toggleTaskMark({ lineNumber: 5, label: 'new mark' });
			expect(file.marks.length).to.eql(1);
			expect(file.marks[0].lineNumber).to.eql(5);
		});
	});

	describe('mergeMarks', () => {
		it('lineNumbers should return numbers ordered with no doubles', () => {
			firstFile.mergeMarks([
				{ lineNumber: 20, label: '' },
				{ lineNumber: 30, label: '' },
				{ lineNumber: 10, label: '' },
				{ lineNumber: 20, label: '' },
				{ lineNumber: 30, label: '' },
			]);
			expect(firstFile.lineNumbers).to.eql([1, 10, 20, 30]);
		});

		it('after adding a second array, lineNumbers should return the combined numbers', () => {
			firstFile.mergeMarks([
				{ lineNumber: 20, label: '' },
				{ lineNumber: 30, label: '' },
				{ lineNumber: 10, label: '' },
			]);
			firstFile.mergeMarks([
				{ lineNumber: 20, label: '' },
				{ lineNumber: 50, label: '' },
				{ lineNumber: 40, label: '' },
			]);
			expect(firstFile.lineNumbers).to.eql([1, 10, 20, 30, 40, 50]);
			expect(firstFile.hasMarks).to.eql(true);
		});

		it('after adding an existing lineNumber, nothing should change', () => {
			firstFile.mergeMarks([
				{ lineNumber: 20, label: '' },
				{ lineNumber: 30, label: '' },
			]);
			firstFile.addMark({ lineNumber: 30, label: '' });
			expect(firstFile.lineNumbers).to.eql([1, 20, 30]);
		});

		it('after adding one new lineNumber, lineNumbers should include it in order', () => {
			firstFile.mergeMarks([
				{ lineNumber: 20, label: '' },
				{ lineNumber: 30, label: '' },
			]);
			firstFile.addMark({ lineNumber: 25, label: '' });
			expect(firstFile.lineNumbers).to.eql([1, 20, 25, 30]);
		});
	});

	describe('mergeMarks and labels', () => {
		it('should keep the label of an existing mark', () => {
			const file = fileWithMark(filePath, 10, 'mine');
			file.mergeMarks([{ lineNumber: 10, label: 'theirs' }]);
			expect(file.allPersistMarks).to.eql([{ lineNumber: 10, label: 'mine' }]);
		});

		it('should take over the label for a mark that has none', () => {
			const file = fileWithMark(filePath, 10, '');
			const mark = file.marks[0];
			file.mergeMarks([{ lineNumber: 10, label: 'theirs' }]);
			expect(file.allPersistMarks).to.eql([{ lineNumber: 10, label: 'theirs' }]);
			expect(file.marks[0]).to.equal(mark);
		});

		it('should not remove a label when the merged mark has none', () => {
			const file = fileWithMark(filePath, 10, 'mine');
			file.mergeMarks([{ lineNumber: 10, label: '' }]);
			expect(file.allPersistMarks).to.eql([{ lineNumber: 10, label: 'mine' }]);
		});

		it('should take the label of the first of two new marks for the same line', () => {
			const file = new File(filePath);
			file.mergeMarks([
				{ lineNumber: 10, label: 'first' },
				{ lineNumber: 10, label: 'second' },
			]);
			expect(file.allPersistMarks).to.eql([{ lineNumber: 10, label: 'first' }]);
		});
	});

	describe('removeMarks', () => {
		it('removes the given mark objects even if another mark now has the same line number', () => {
			const file = new File(filePath);
			file.addMark({ lineNumber: 7, label: 'stale' });
			file.addMark({ lineNumber: 12, label: 'shifted' });
			const [stale, shifted] = file.marks;
			shifted.lineNumber = 7;

			file.removeMarks([stale]);

			expect(file.marks).to.eql([shifted]);
			expect(file.marks[0].label).to.equal('shifted');
		});
	});

	describe('hasMarks', () => {
		it('should return false if there are no marks', () => {
			const emptyFile = new File(filePath);
			expect(emptyFile.hasMarks).to.be.false;
		});

		it('should return true if there are marks', () => {
			const lineNumber = 10;
			const label = 'test';

			const file = fileWithMark(filePath, lineNumber, label);
			expect(file.hasMarks).to.be.true;
		});
	});
});
