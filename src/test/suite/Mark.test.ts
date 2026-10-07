import { describe, it } from 'mocha';
import { expect } from 'chai';

import { Mark } from '../../Mark';

describe('Mark', () => {
	it('should have the line number and label it was created with', () => {
		const mark = new Mark(5, 'My mark');
		expect(mark.lineNumber).to.equal(5);
		expect(mark.label).to.equal('My mark');
	});

	it('should allow setting lineNumber', () => {
		const mark = new Mark(10, 'label');
		mark.lineNumber = 20;
		expect(mark.lineNumber).to.equal(20);
	});

	it('should allow setting label', () => {
		const mark = new Mark(10, '');
		mark.label = 'label';
		expect(mark.label).to.equal('label');
	});
});
