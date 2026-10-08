import { describe, it } from 'mocha';
import { expect } from 'chai';
import { findNextMark, findPreviousMark, findNextFileWithMarks, findPreviousFileWithMarks } from '../../core/navigation';

describe('Navigation (pure)', () => {
	describe('findNextMark', () => {
		it('should find the next mark after current line', () => {
			const lineNumbers = [10, 20, 30, 40];
			expect(findNextMark(15, lineNumbers)).to.equal(20);
		});

		it('should return first mark if current line is before all marks', () => {
			const lineNumbers = [10, 20, 30];
			expect(findNextMark(5, lineNumbers)).to.equal(10);
		});

		it('should return undefined if current line is after all marks', () => {
			const lineNumbers = [10, 20, 30];
			expect(findNextMark(35, lineNumbers)).to.be.undefined;
		});

		it('should return undefined for empty line numbers', () => {
			expect(findNextMark(10, [])).to.be.undefined;
		});

		it('should skip the current line (not equal)', () => {
			const lineNumbers = [10, 20, 30];
			expect(findNextMark(20, lineNumbers)).to.equal(30);
		});
	});

	describe('findPreviousMark', () => {
		it('should find the previous mark before current line', () => {
			const lineNumbers = [10, 20, 30, 40];
			expect(findPreviousMark(25, lineNumbers)).to.equal(20);
		});

		it('should return last mark if current line is after all marks', () => {
			const lineNumbers = [10, 20, 30];
			expect(findPreviousMark(50, lineNumbers)).to.equal(30);
		});

		it('should return undefined if current line is before all marks', () => {
			const lineNumbers = [10, 20, 30];
			expect(findPreviousMark(5, lineNumbers)).to.be.undefined;
		});

		it('should return undefined for empty line numbers', () => {
			expect(findPreviousMark(10, [])).to.be.undefined;
		});

		it('should skip the current line (not equal)', () => {
			const lineNumbers = [10, 20, 30];
			expect(findPreviousMark(20, lineNumbers)).to.equal(10);
		});
	});

	describe('findNextFileWithMarks', () => {
		const files = [
			{ filepath: '/file1.ts', lineNumbers: [10, 20] },
			{ filepath: '/file2.ts', lineNumbers: [] },
			{ filepath: '/file3.ts', lineNumbers: [5, 15] },
		];

		it('should find next file with marks', () => {
			const result = findNextFileWithMarks(files, 0);
			expect(result).to.deep.equal({ filepath: '/file3.ts', lineNumber: 5 });
		});

		it('should wrap around to beginning', () => {
			const result = findNextFileWithMarks(files, 2);
			expect(result).to.deep.equal({ filepath: '/file1.ts', lineNumber: 10 });
		});

		it('should skip files without marks', () => {
			const result = findNextFileWithMarks(files, 0);
			expect(result?.filepath).to.equal('/file3.ts');
		});

		it('should return undefined for empty files array', () => {
			expect(findNextFileWithMarks([], 0)).to.be.undefined;
		});

		it('should return undefined if no files have marks', () => {
			const emptyFiles = [
				{ filepath: '/a.ts', lineNumbers: [] },
				{ filepath: '/b.ts', lineNumbers: [] },
			];
			expect(findNextFileWithMarks(emptyFiles, 0)).to.be.undefined;
		});

		it('should return the current file if it is the only one with marks', () => {
			const onlyOne = [
				{ filepath: '/a.ts', lineNumbers: [3, 7] },
				{ filepath: '/b.ts', lineNumbers: [] },
			];
			expect(findNextFileWithMarks(onlyOne, 0)).to.deep.equal({ filepath: '/a.ts', lineNumber: 3 });
		});

		it('should start at the first file if there is no current file', () => {
			expect(findNextFileWithMarks(files, -1)).to.deep.equal({ filepath: '/file1.ts', lineNumber: 10 });
		});
	});

	describe('findPreviousFileWithMarks', () => {
		const files = [
			{ filepath: '/file1.ts', lineNumbers: [10, 20] },
			{ filepath: '/file2.ts', lineNumbers: [] },
			{ filepath: '/file3.ts', lineNumbers: [5, 15] },
		];

		it('should find previous file with marks', () => {
			const result = findPreviousFileWithMarks(files, 2);
			expect(result).to.deep.equal({ filepath: '/file1.ts', lineNumber: 20 });
		});

		it('should wrap around to end', () => {
			const result = findPreviousFileWithMarks(files, 0);
			expect(result).to.deep.equal({ filepath: '/file3.ts', lineNumber: 15 });
		});

		it('should return last line number of file', () => {
			const result = findPreviousFileWithMarks(files, 2);
			expect(result?.lineNumber).to.equal(20);
		});

		it('should return undefined for empty files array', () => {
			expect(findPreviousFileWithMarks([], 0)).to.be.undefined;
		});

		it('should return undefined if no files have marks', () => {
			const emptyFiles = [
				{ filepath: '/a.ts', lineNumbers: [] },
				{ filepath: '/b.ts', lineNumbers: [] },
			];
			expect(findPreviousFileWithMarks(emptyFiles, 0)).to.be.undefined;
		});

		it('should return the current file if it is the only one with marks', () => {
			const onlyOne = [
				{ filepath: '/a.ts', lineNumbers: [] },
				{ filepath: '/b.ts', lineNumbers: [3, 7] },
			];
			expect(findPreviousFileWithMarks(onlyOne, 1)).to.deep.equal({ filepath: '/b.ts', lineNumber: 7 });
		});

		it('should start at the last file if there is no current file', () => {
			expect(findPreviousFileWithMarks(files, -1)).to.deep.equal({ filepath: '/file3.ts', lineNumber: 15 });
		});
	});
});
