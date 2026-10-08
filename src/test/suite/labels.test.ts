import { describe, it } from 'mocha';
import { expect } from 'chai';
import { combineLabels, isLabelConflict, labelRepeatsLine, mergeLabels, suggestLabel, type LabelSymbol } from '../../core/labels';

describe('Labels (pure)', () => {
	describe('suggestLabel', () => {
		// a DocumentSymbol: range is the whole symbol, selectionRange its name
		function symbol(name: string, line: number, character = 0, children: LabelSymbol[] = []): LabelSymbol {
			return { name, selectionRange: { start: { line, character } }, children };
		}

		it('should return the name of the symbol that is declared in the line', () => {
			expect(suggestLabel([symbol('first', 2), symbol('second', 8)], 8)).to.equal('second');
		});

		it('should find a method inside a class', () => {
			const symbols = [symbol('Commands', 3, 22, [symbol('toggleMark', 10, 14), symbol('editLabel', 20, 14)])];
			expect(suggestLabel(symbols, 20)).to.equal('editLabel');
			expect(suggestLabel(symbols, 3)).to.equal('Commands');
		});

		it('should return nothing for a line inside a method, or without symbols', () => {
			expect(suggestLabel([symbol('Commands', 3, 0, [symbol('toggleMark', 10)])], 12)).to.equal('');
			expect(suggestLabel([], 0)).to.equal('');
			expect(suggestLabel(undefined, 0)).to.equal('');
			expect(suggestLabel(null, 0)).to.equal('');
		});

		it('should take the leftmost of several symbols in one line', () => {
			expect(suggestLabel([symbol('Point', 5, 6, [symbol('y', 5, 20), symbol('x', 5, 14)])], 5)).to.equal('Point');
			expect(suggestLabel([symbol('b', 5, 12), symbol('a', 5, 6)], 5)).to.equal('a');
		});

		it('should read the flat list of an older symbol provider', () => {
			const symbols: LabelSymbol[] = [
				{ name: 'first', location: { range: { start: { line: 2, character: 0 } } } },
				{ name: 'second', location: { range: { start: { line: 8, character: 4 } } } },
			];
			expect(suggestLabel(symbols, 8)).to.equal('second');
		});

		it('should cut off the signature that some languages report with the name', () => {
			expect(suggestLabel([symbol('JobSaveEventHandler(JobsConfiguration) : void', 5, 14)], 5)).to.equal('JobSaveEventHandler');
			expect(suggestLabel([symbol('(anonymous)', 5)], 5)).to.equal('(anonymous)');
		});

		it('should cut off the type that some languages report with the name', () => {
			expect(suggestLabel([symbol('_updateFolderPath : string', 5, 16)], 5)).to.equal('_updateFolderPath');
			expect(suggestLabel([symbol('CreateUpdateCommand : ICommand', 5, 16)], 5)).to.equal('CreateUpdateCommand');
			expect(suggestLabel([symbol('Scope::Run', 5)], 5)).to.equal('Scope::Run');
		});

		it('should skip a symbol without name', () => {
			expect(suggestLabel([symbol(' ', 5, 0), symbol('named', 5, 9)], 5)).to.equal('named');
		});
	});

	describe('labelRepeatsLine', () => {
		it('should be true for a label that is part of the line', () => {
			expect(labelRepeatsLine('toggleMark', '\tstatic async toggleMark(): Promise<void> {')).to.be.true;
		});

		it('should be false for another label, and for no label', () => {
			expect(labelRepeatsLine('start here', '\tstatic async toggleMark(): Promise<void> {')).to.be.false;
			expect(labelRepeatsLine('toggleMark: start here', '\tstatic async toggleMark(): Promise<void> {')).to.be.false;
			expect(labelRepeatsLine('', 'any line')).to.be.false;
		});
	});

	describe('isLabelConflict', () => {
		it('should be a conflict when both marks have a label and the labels differ', () => {
			expect(isLabelConflict('mine', 'theirs')).to.be.true;
		});

		it('should be no conflict when the labels are the same or one mark has none', () => {
			expect(isLabelConflict('same', 'same')).to.be.false;
			expect(isLabelConflict('', 'theirs')).to.be.false;
			expect(isLabelConflict('mine', '')).to.be.false;
			expect(isLabelConflict('', '')).to.be.false;
		});
	});

	describe('combineLabels', () => {
		it('should put both labels into one, the own one first', () => {
			expect(combineLabels('mine', 'theirs')).to.equal('mine / theirs');
		});

		it('should not repeat a label that the other one already contains', () => {
			expect(combineLabels('mine / theirs', 'theirs')).to.equal('mine / theirs');
			expect(combineLabels('mine', 'mine / theirs')).to.equal('mine / theirs');
			expect(combineLabels('same', 'same')).to.equal('same');
		});

		it('should return the label that is there if the other one is empty', () => {
			expect(combineLabels('mine', '')).to.equal('mine');
			expect(combineLabels('', 'theirs')).to.equal('theirs');
			expect(combineLabels('', '')).to.equal('');
		});
	});

	describe('mergeLabels', () => {
		it('should follow the choice when the labels differ', () => {
			expect(mergeLabels('mine', 'theirs', 'keep')).to.equal('mine');
			expect(mergeLabels('mine', 'theirs', 'take')).to.equal('theirs');
			expect(mergeLabels('mine', 'theirs', 'combine')).to.equal('mine / theirs');
		});

		it('should take over a label for a mark that has none, whatever the choice', () => {
			expect(mergeLabels('', 'theirs', 'keep')).to.equal('theirs');
			expect(mergeLabels('', 'theirs', 'take')).to.equal('theirs');
			expect(mergeLabels('', 'theirs', 'combine')).to.equal('theirs');
		});

		it('should never remove a label because the other mark has none', () => {
			expect(mergeLabels('mine', '', 'keep')).to.equal('mine');
			expect(mergeLabels('mine', '', 'take')).to.equal('mine');
			expect(mergeLabels('mine', '', 'combine')).to.equal('mine');
		});
	});
});
