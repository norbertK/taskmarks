import { describe, it } from 'mocha';
import { expect } from 'chai';
import { adjustMarkLineNumbers } from '../../core/lineAdjustment';

describe('lineAdjustment', () => {
	describe('adjustMarkLineNumbers', () => {
		// Issue #22: marker does not move while deleting / inserting lines
		describe('Issue #22 - marks should move when lines are inserted/deleted', () => {
			it('should shift marks down when lines are inserted above them', () => {
				const marks = [
					{ lineNumber: 10 },
					{ lineNumber: 20 },
					{ lineNumber: 30 },
				];
				// Insert 5 lines at line 5
				const result = adjustMarkLineNumbers(marks, 5, 5, 100);

				expect(result.adjusted.map(m => m.lineNumber)).to.eql([15, 25, 35]);
				expect(result.removed).to.eql([]);
			});

			it('should shift marks up when lines are deleted above them', () => {
				const marks = [
					{ lineNumber: 10 },
					{ lineNumber: 20 },
					{ lineNumber: 30 },
				];
				// Delete 5 lines starting at line 5
				const result = adjustMarkLineNumbers(marks, 5, -5, 95);

				expect(result.adjusted.map(m => m.lineNumber)).to.eql([5, 15, 25]);
				expect(result.removed).to.eql([]);
			});

			it('should not move marks that are before the change point', () => {
				const marks = [
					{ lineNumber: 5 },
					{ lineNumber: 10 },
					{ lineNumber: 20 },
				];
				// Insert 3 lines at line 15
				const result = adjustMarkLineNumbers(marks, 15, 3, 100);

				expect(result.adjusted.map(m => m.lineNumber)).to.eql([5, 10, 23]);
				expect(result.removed).to.eql([]);
			});

			it('should not move marks at exactly the change line', () => {
				const marks = [
					{ lineNumber: 10 },
					{ lineNumber: 20 },
				];
				// Insert at line 10
				const result = adjustMarkLineNumbers(marks, 10, 5, 100);

				// Mark at line 10 stays, mark at 20 moves to 25
				expect(result.adjusted.map(m => m.lineNumber)).to.eql([10, 25]);
			});
		});

		// Issue #45: if too many lines are deleted, marker at end can not be removed
		describe('Issue #45 - marks should be removed when they would go out of bounds', () => {
			it('should remove marks that would have negative line numbers', () => {
				const marks = [
					{ lineNumber: 5 },
					{ lineNumber: 10 },
				];
				// Delete 20 lines starting at line 2 (way more than exists after line 2)
				const result = adjustMarkLineNumbers(marks, 2, -20, 5);

				// Mark at 5 would become 5-20=-15 (negative), should be removed
				// Mark at 10 would become 10-20=-10 (negative), should be removed
				expect(result.adjusted.map(m => m.lineNumber)).to.eql([]);
				expect(result.removed.length).to.eql(2);
			});

			it('should remove marks that are in deleted range', () => {
				const marks = [
					{ lineNumber: 50 },
					{ lineNumber: 80 },
				];
				// Delete 90 lines at line 5 - deleted range is [5, 95)
				// Marks at 50 and 80 ARE in deleted range [5, 95)
				const result = adjustMarkLineNumbers(marks, 5, -90, 10);

				// Both marks are in the deleted range
				expect(result.adjusted).to.eql([]);
				expect(result.removed.length).to.eql(2);
			});

			it('should adjust marks after deleted range correctly', () => {
				const marks = [
					{ lineNumber: 95 },
					{ lineNumber: 98 },
				];
				// Delete 50 lines at line 40 - document shrinks from 100 to 50 lines
				// Marks at 95, 98 are AFTER deleted range [40, 90), become 45, 48
				const result = adjustMarkLineNumbers(marks, 40, -50, 50);

				expect(result.adjusted.map((m) => m.lineNumber)).to.eql([45, 48]);
				expect(result.removed).to.eql([]);
			});

			it('should remove marks that are in the deleted range', () => {
				const marks = [
					{ lineNumber: 5 },   // before deletion - keep
					{ lineNumber: 12 },  // in deleted range (10-20) - remove
					{ lineNumber: 15 },  // in deleted range (10-20) - remove
					{ lineNumber: 25 },  // after deletion - adjust to 15
				];
				// Delete lines 10-19 (10 lines starting at line 10)
				const result = adjustMarkLineNumbers(marks, 10, -10, 90);

				expect(result.adjusted.map(m => m.lineNumber)).to.eql([5, 15]);
				expect(result.removed.length).to.eql(2);
			});

			it('should handle mark at last line when that line is deleted', () => {
				const marks = [
					{ lineNumber: 99 },  // last line of 100-line document
				];
				// Delete last 11 lines (89-99) - deleted range is [89, 100)
				const result = adjustMarkLineNumbers(marks, 89, -11, 89);

				// Mark at 99 is in deleted range [89, 100), should be removed
				expect(result.adjusted).to.eql([]);
				expect(result.removed.length).to.eql(1);
			});

			it('should keep mark at last line if document still has that line', () => {
				const marks = [
					{ lineNumber: 50 },
				];
				// Delete 10 lines at the end (lines 90-99)
				const result = adjustMarkLineNumbers(marks, 90, -10, 90);

				// Mark at 50 is unchanged
				expect(result.adjusted.map(m => m.lineNumber)).to.eql([50]);
				expect(result.removed).to.eql([]);
			});
		});

		describe('edge cases', () => {
			it('should handle empty marks array', () => {
				const result = adjustMarkLineNumbers([], 10, 5, 100);
				expect(result.adjusted).to.eql([]);
				expect(result.removed).to.eql([]);
			});

			it('should handle single mark insertion', () => {
				const marks = [{ lineNumber: 10 }];
				const result = adjustMarkLineNumbers(marks, 5, 1, 101);
				expect(result.adjusted.map(m => m.lineNumber)).to.eql([11]);
			});

			it('should handle single mark deletion', () => {
				const marks = [{ lineNumber: 10 }];
				const result = adjustMarkLineNumbers(marks, 5, -1, 99);
				expect(result.adjusted.map(m => m.lineNumber)).to.eql([9]);
			});

			it('should handle mark at line 0', () => {
				const marks = [{ lineNumber: 0 }];
				// Insert at line 0
				const result = adjustMarkLineNumbers(marks, 0, 5, 105);
				// Mark at line 0 is at change point, stays at 0
				expect(result.adjusted.map(m => m.lineNumber)).to.eql([0]);
			});

			it('should handle document becoming empty', () => {
				const marks = [
					{ lineNumber: 0 },
					{ lineNumber: 5 },
				];
				// Delete all 10 lines
				const result = adjustMarkLineNumbers(marks, 0, -10, 0);
				// All marks should be removed since document is empty
				expect(result.adjusted).to.eql([]);
				expect(result.removed.length).to.eql(2);
			});
		});
	});
});
