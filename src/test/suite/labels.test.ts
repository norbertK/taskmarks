import { describe, it } from 'mocha';
import { expect } from 'chai';
import { combineLabels, isLabelConflict, mergeLabels } from '../../core/labels';

describe('Labels (pure)', () => {
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
