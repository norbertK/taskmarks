import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mapLineThroughChange, mapMarkLines, type TextChange } from '../../core/lineAdjustment';

function change(startLine: number, startCharacter: number, endLine: number, endCharacter: number, text: string): TextChange {
	return { startLine, startCharacter, endLine, endCharacter, text };
}

describe('lineAdjustment', () => {
	describe('mapLineThroughChange', () => {
		describe('typing within a line', () => {
			it('keeps every mark when text is typed without newlines', () => {
				const typing = change(5, 3, 5, 3, 'abc');
				expect([4, 5, 6].map((l) => mapLineThroughChange(l, typing))).to.eql([4, 5, 6]);
			});
		});

		describe('issue #22 - marks move with inserted and deleted lines', () => {
			it('shifts marks below a pasted block down', () => {
				const paste = change(5, 0, 5, 0, 'a\nb\nc\n');
				expect(mapLineThroughChange(10, paste)).to.equal(13);
			});

			it('leaves marks above an insertion alone', () => {
				const paste = change(5, 0, 5, 0, 'a\nb\n');
				expect(mapLineThroughChange(4, paste)).to.equal(4);
			});

			it('keeps the mark when Enter is pressed at the end of the marked line', () => {
				const enter = change(5, 20, 5, 20, '\n');
				expect(mapLineThroughChange(5, enter)).to.equal(5);
				expect(mapLineThroughChange(6, enter)).to.equal(7);
			});

			it('keeps the mark when Enter is pressed in the middle of the marked line', () => {
				const enter = change(5, 4, 5, 4, '\n');
				expect(mapLineThroughChange(5, enter)).to.equal(5);
			});

			it('moves the mark down with its text when Enter is pressed at column 0', () => {
				const enter = change(5, 0, 5, 0, '\n');
				expect(mapLineThroughChange(5, enter)).to.equal(6);
			});

			it('shifts marks below deleted whole lines up', () => {
				const deleteLines5to9 = change(5, 0, 10, 0, '');
				expect(mapLineThroughChange(12, deleteLines5to9)).to.equal(7);
			});
		});

		describe('issue #45 - marks on deleted lines are removed', () => {
			it('removes marks on whole lines that were deleted', () => {
				const deleteLines5to9 = change(5, 0, 10, 0, '');
				expect(mapLineThroughChange(5, deleteLines5to9)).to.be.undefined;
				expect(mapLineThroughChange(7, deleteLines5to9)).to.be.undefined;
				expect(mapLineThroughChange(9, deleteLines5to9)).to.be.undefined;
			});

			it('keeps the mark on the line directly after the deleted block and moves it up', () => {
				const deleteLines5to9 = change(5, 0, 10, 0, '');
				expect(mapLineThroughChange(10, deleteLines5to9)).to.equal(5);
			});

			it('removes a mark on the last line when the file tail is deleted', () => {
				// 100-line file, select from end of line 89 to end of line 99 and delete
				const deleteTail = change(89, 30, 99, 12, '');
				expect(mapLineThroughChange(99, deleteTail)).to.be.undefined;
				expect(mapLineThroughChange(89, deleteTail)).to.equal(89);
			});
		});

		describe('joining lines', () => {
			it('keeps the mark when Delete is pressed at the end of the marked line', () => {
				const deleteAtEndOfLine4 = change(4, 25, 5, 0, '');
				expect(mapLineThroughChange(4, deleteAtEndOfLine4)).to.equal(4);
			});

			it('removes the mark of the line that was joined onto the line above', () => {
				const backspaceAtStartOfLine5 = change(4, 25, 5, 0, '');
				expect(mapLineThroughChange(5, backspaceAtStartOfLine5)).to.be.undefined;
				expect(mapLineThroughChange(6, backspaceAtStartOfLine5)).to.equal(5);
			});

			it('removes the mark of a partially deleted last line', () => {
				const deleteIntoLine7 = change(5, 10, 7, 4, '');
				expect(mapLineThroughChange(7, deleteIntoLine7)).to.be.undefined;
				expect(mapLineThroughChange(5, deleteIntoLine7)).to.equal(5);
			});
		});

		describe('replacing a block', () => {
			it('keeps the last line when the replacement ends with a newline', () => {
				// replace whole lines 5-6 with three new lines
				const replace = change(5, 0, 7, 0, 'x\ny\nz\n');
				expect(mapLineThroughChange(5, replace)).to.be.undefined;
				expect(mapLineThroughChange(7, replace)).to.equal(8);
				expect(mapLineThroughChange(20, replace)).to.equal(21);
			});

			it('handles CRLF line endings', () => {
				const paste = change(5, 0, 5, 0, 'a\r\nb\r\n');
				expect(mapLineThroughChange(8, paste)).to.equal(10);
			});
		});
	});

	describe('mapMarkLines', () => {
		it('returns the lines unchanged when there are no changes', () => {
			expect(mapMarkLines([1, 5, 9], [], 20)).to.eql([1, 5, 9]);
		});

		it('applies multi-cursor changes in pre-edit coordinates', () => {
			// Enter at end of line 2 and at end of line 8, both reported in pre-edit coordinates
			const changes = [change(2, 10, 2, 10, '\n'), change(8, 10, 8, 10, '\n')];
			expect(mapMarkLines([1, 5, 9], changes, 22)).to.eql([1, 6, 11]);
		});

		it('gives the same result regardless of the order changes are reported in', () => {
			const changes = [change(8, 0, 10, 0, ''), change(2, 0, 2, 0, 'a\n')];
			const reversed = [...changes].reverse();
			expect(mapMarkLines([1, 5, 9, 12], changes, 20)).to.eql(mapMarkLines([1, 5, 9, 12], reversed, 20));
			expect(mapMarkLines([1, 5, 9, 12], changes, 20)).to.eql([1, 6, undefined, 11]);
		});

		it('removes marks that end up past the end of the document', () => {
			expect(mapMarkLines([3, 15], [], 10)).to.eql([3, undefined]);
		});

		it('removes a mark that would land on a line another mark already has', () => {
			expect(mapMarkLines([4, 4], [], 10)).to.eql([4, undefined]);
		});

		it('removes all marks when the whole document is deleted', () => {
			const deleteAll = change(0, 0, 9, 15, '');
			expect(mapMarkLines([0, 5, 9], [deleteAll], 1)).to.eql([0, undefined, undefined]);
		});
	});
});
