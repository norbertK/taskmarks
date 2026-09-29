import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
// import { vscode } from '../mock/vscode.mock';

// import { IPersistFile, IPersistMark } from '../../types';
import { File } from '../../File';
// import { Mark } from '../../Mark';

describe('File', () => {
	const filePath = 'test.js';
	const lineNumber = 1;
	const label = 'test mark';
	let firstFile: File;

	beforeEach(() => {
		firstFile = new File(filePath, lineNumber, label);
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
		it('should have a filepath and an empty number array', () => {
			firstFile = new File(filePath, lineNumber, label);
			expect(firstFile.filepath).to.eql('test.js');
			expect(firstFile.lineNumbers).to.eql([1]);
		});
	});

	describe('constructor', () => {
		it('should initialize with filepath and no marks if line number is not provided', () => {
			const filePath = '/path/to/file.txt';
			const file = new File(filePath);
			expect(file.filepath).to.eql(filePath);
			expect(file.marks).to.eql([]);
		});

		it('should initialize with filepath and a mark if line number is provided', () => {
			const filePath = '/path/to/file.txt';
			const lineNumber = 10;
			const label = 'Test label';
			const file = new File(filePath, lineNumber, label);
			expect(file.filepath).to.eql(filePath);
			expect(file.marks.length).to.eql(1);
			expect(file.marks[0].lineNumber).to.eql(lineNumber);
			expect(file.marks[0].label).to.eql(label);
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
			const file = new File(filePath, lineNumber, label);
			expect(file.hasMark(lineNumber)).to.eql(true);
		});

		it('should return false if a mark with the given line number does not exist in the file', () => {
			const filePath = '/path/to/file.txt';
			const lineNumber = 10;
			const label = 'Test label';
			const file = new File(filePath, lineNumber, label);
			expect(file.hasMark(20)).to.eql(false);
		});
	});

	describe('toggleTaskMark', () => {
		it('should remove a mark if it already exists in the file', () => {
			const filePath = '/path/to/file.txt';
			const lineNumber = 10;
			const label = 'Test label';
			const file = new File(filePath, lineNumber, label);
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

	describe('mergeMarksAndLineNumbers', () => {
		it('lineNumbers should return numbers ordered with no doubles', () => {
			firstFile.mergeMarksAndLineNumbers([
				{ lineNumber: 20, label: '' },
				{ lineNumber: 30, label: '' },
				{ lineNumber: 10, label: '' },
				{ lineNumber: 20, label: '' },
				{ lineNumber: 30, label: '' },
			]);
			expect(firstFile.lineNumbers).to.eql([1, 10, 20, 30]);
		});

		it('after adding a second array, lineNumbers should return the combined numbers', () => {
			firstFile.mergeMarksAndLineNumbers([
				{ lineNumber: 20, label: '' },
				{ lineNumber: 30, label: '' },
				{ lineNumber: 10, label: '' },
			]);
			firstFile.mergeMarksAndLineNumbers([
				{ lineNumber: 20, label: '' },
				{ lineNumber: 50, label: '' },
				{ lineNumber: 40, label: '' },
			]);
			expect(firstFile.lineNumbers).to.eql([1, 10, 20, 30, 40, 50]);
			expect(firstFile.hasMarks).to.eql(true);
		});

		it('after adding an existing lineNumber, nothing should change', () => {
			firstFile.mergeMarksAndLineNumbers([
				{ lineNumber: 20, label: '' },
				{ lineNumber: 30, label: '' },
			]);
			firstFile.addMark({ lineNumber: 30, label: '' });
			expect(firstFile.lineNumbers).to.eql([1, 20, 30]);
		});

		it('after adding one new lineNumber, lineNumbers should include it in order', () => {
			firstFile.mergeMarksAndLineNumbers([
				{ lineNumber: 20, label: '' },
				{ lineNumber: 30, label: '' },
			]);
			firstFile.addMark({ lineNumber: 25, label: '' });
			expect(firstFile.lineNumbers).to.eql([1, 20, 25, 30]);
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

			const fileWithMark = new File(filePath, lineNumber, label);
			expect(fileWithMark.hasMarks).to.be.true;
		});
	});
});
