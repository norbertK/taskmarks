import { describe, it } from 'mocha';
import { expect } from 'chai';
import { missingBreakpoints, moveBreakpoints, sameLocation, sortBreakpoints, toBreakpoint } from '../../core/breakpoints';
import type { TextChange } from '../../core/lineAdjustment';
import type { IPersistBreakpoint } from '../../types';

describe('core/breakpoints', () => {
	const fileA = '/src/a.ts';
	const fileB = '/src/b.ts';

	describe('toBreakpoint', () => {
		it('takes over the file and the line', () => {
			expect(toBreakpoint({ filepath: fileA, lineNumber: 4 })).to.deep.equal({ filepath: fileA, lineNumber: 4 });
		});

		it('leaves out what VS Code has by default', () => {
			const defaults = { filepath: fileA, lineNumber: 4, column: 0, enabled: true, condition: undefined, hitCondition: '', logMessage: undefined };
			expect(toBreakpoint(defaults)).to.deep.equal({ filepath: fileA, lineNumber: 4 });
		});

		it('keeps the column, a disabled breakpoint, the conditions and the log message', () => {
			const breakpoint = { filepath: fileA, lineNumber: 4, column: 12, enabled: false, condition: 'i > 3', hitCondition: '5', logMessage: 'i = {i}' };
			expect(toBreakpoint(breakpoint)).to.deep.equal(breakpoint);
		});

		it('writes the fields in the same order, whatever the order of the source', () => {
			const breakpoint = toBreakpoint({ logMessage: 'here', enabled: false, column: 2, lineNumber: 4, filepath: fileA, condition: 'x' });
			expect(JSON.stringify(breakpoint)).to.equal(
				'{"filepath":"/src/a.ts","lineNumber":4,"column":2,"enabled":false,"condition":"x","logMessage":"here"}'
			);
		});

		it('drops what it does not know', () => {
			expect(toBreakpoint({ filepath: fileA, lineNumber: 4, column: -1, enabled: 'no', condition: 7, mode: 'hardware' })).to.deep.equal({
				filepath: fileA,
				lineNumber: 4,
			});
		});

		it('returns undefined for anything that is not a breakpoint', () => {
			expect(toBreakpoint(undefined)).to.be.undefined;
			expect(toBreakpoint(null)).to.be.undefined;
			expect(toBreakpoint(4)).to.be.undefined;
			expect(toBreakpoint({ lineNumber: 4 })).to.be.undefined;
			expect(toBreakpoint({ filepath: '', lineNumber: 4 })).to.be.undefined;
			expect(toBreakpoint({ filepath: fileA })).to.be.undefined;
			expect(toBreakpoint({ filepath: fileA, lineNumber: -1 })).to.be.undefined;
			expect(toBreakpoint({ filepath: fileA, lineNumber: 1.5 })).to.be.undefined;
			expect(toBreakpoint({ filepath: fileA, lineNumber: '4' })).to.be.undefined;
		});
	});

	describe('sameLocation', () => {
		it('compares file, line and column', () => {
			expect(sameLocation({ filepath: fileA, lineNumber: 4 }, { filepath: fileA, lineNumber: 4, condition: 'x' })).to.be.true;
			expect(sameLocation({ filepath: fileA, lineNumber: 4 }, { filepath: fileB, lineNumber: 4 })).to.be.false;
			expect(sameLocation({ filepath: fileA, lineNumber: 4 }, { filepath: fileA, lineNumber: 5 })).to.be.false;
			expect(sameLocation({ filepath: fileA, lineNumber: 4 }, { filepath: fileA, lineNumber: 4, column: 8 })).to.be.false;
		});
	});

	describe('sortBreakpoints', () => {
		it('sorts by file, line and column without changing the list it got', () => {
			const breakpoints: IPersistBreakpoint[] = [
				{ filepath: fileB, lineNumber: 1 },
				{ filepath: fileA, lineNumber: 9 },
				{ filepath: fileA, lineNumber: 2, column: 7 },
				{ filepath: fileA, lineNumber: 2 },
				{ filepath: fileB, lineNumber: 0 },
				{ filepath: fileA, lineNumber: 2, column: 3 },
			];

			expect(sortBreakpoints(breakpoints)).to.deep.equal([
				{ filepath: fileA, lineNumber: 2 },
				{ filepath: fileA, lineNumber: 2, column: 3 },
				{ filepath: fileA, lineNumber: 2, column: 7 },
				{ filepath: fileA, lineNumber: 9 },
				{ filepath: fileB, lineNumber: 0 },
				{ filepath: fileB, lineNumber: 1 },
			]);
			expect(sortBreakpoints([...breakpoints].reverse())).to.deep.equal(sortBreakpoints(breakpoints));
			expect(breakpoints[0].filepath).to.equal(fileB);
		});
	});

	describe('missingBreakpoints', () => {
		it('returns the breakpoints of the others at locations that have none', () => {
			const own: IPersistBreakpoint[] = [{ filepath: fileA, lineNumber: 2, condition: 'mine' }];
			const others: IPersistBreakpoint[] = [
				{ filepath: fileA, lineNumber: 2, condition: 'theirs' },
				{ filepath: fileA, lineNumber: 5 },
				{ filepath: fileB, lineNumber: 2 },
			];
			expect(missingBreakpoints(own, others)).to.deep.equal([
				{ filepath: fileA, lineNumber: 5 },
				{ filepath: fileB, lineNumber: 2 },
			]);
		});

		it('returns a location only once', () => {
			const others: IPersistBreakpoint[] = [
				{ filepath: fileA, lineNumber: 5 },
				{ filepath: fileA, lineNumber: 5, condition: 'again' },
			];
			expect(missingBreakpoints([], others)).to.deep.equal([{ filepath: fileA, lineNumber: 5 }]);
		});
	});

	describe('moveBreakpoints', () => {
		const insertLineAt = (line: number): TextChange => ({ startLine: line, startCharacter: 0, endLine: line, endCharacter: 0, text: 'new\n' });
		const deleteLines = (from: number, to: number): TextChange => ({ startLine: from, startCharacter: 0, endLine: to, endCharacter: 0, text: '' });

		it('moves the breakpoints below an inserted line, in the changed file only', () => {
			const breakpoints: IPersistBreakpoint[] = [
				{ filepath: fileA, lineNumber: 1 },
				{ filepath: fileA, lineNumber: 5, column: 3, condition: 'x' },
				{ filepath: fileB, lineNumber: 5 },
			];

			expect(moveBreakpoints(breakpoints, fileA, [insertLineAt(3)], 20)).to.deep.equal([
				{ filepath: fileA, lineNumber: 1 },
				{ filepath: fileA, lineNumber: 6, column: 3, condition: 'x' },
				{ filepath: fileB, lineNumber: 5 },
			]);
			expect(breakpoints[1].lineNumber).to.equal(5);
		});

		it('keeps two breakpoints of one line together', () => {
			const breakpoints: IPersistBreakpoint[] = [
				{ filepath: fileA, lineNumber: 5 },
				{ filepath: fileA, lineNumber: 5, column: 9 },
			];
			expect(moveBreakpoints(breakpoints, fileA, [insertLineAt(0)], 20)).to.deep.equal([
				{ filepath: fileA, lineNumber: 6 },
				{ filepath: fileA, lineNumber: 6, column: 9 },
			]);
		});

		it('removes a breakpoint whose line is deleted', () => {
			const breakpoints: IPersistBreakpoint[] = [
				{ filepath: fileA, lineNumber: 4 },
				{ filepath: fileA, lineNumber: 8 },
			];
			expect(moveBreakpoints(breakpoints, fileA, [deleteLines(3, 6)], 20)).to.deep.equal([{ filepath: fileA, lineNumber: 5 }]);
		});

		it('removes a breakpoint behind the last line', () => {
			expect(moveBreakpoints([{ filepath: fileA, lineNumber: 8 }], fileA, [insertLineAt(20)], 5)).to.deep.equal([]);
		});

		it('returns undefined when no breakpoint is affected', () => {
			const breakpoints: IPersistBreakpoint[] = [{ filepath: fileA, lineNumber: 1 }];
			expect(moveBreakpoints(breakpoints, fileA, [insertLineAt(3)], 20)).to.be.undefined;
			expect(moveBreakpoints(breakpoints, fileB, [insertLineAt(0)], 20)).to.be.undefined;
			expect(moveBreakpoints([], fileA, [insertLineAt(0)], 20)).to.be.undefined;
		});
	});
});
