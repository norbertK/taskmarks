import { describe, it } from 'mocha';
import { expect } from 'chai';
import { getErrorMessage, getErrorStack } from '../../core/errors';

describe('Errors (pure)', () => {
	describe('getErrorMessage', () => {
		it('should return message from Error object', () => {
			const error = new Error('test error message');
			const message = getErrorMessage(error);
			expect(message).to.equal('test error message');
		});

		it('should return message from object with message property', () => {
			const error = { message: 'custom error' };
			const message = getErrorMessage(error);
			expect(message).to.equal('custom error');
		});

		it('should stringify non-error objects', () => {
			const error = { code: 404, status: 'not found' };
			const message = getErrorMessage(error);
			expect(message).to.equal('{"code":404,"status":"not found"}');
		});

		it('should convert string to error message', () => {
			const error = 'simple string error';
			const message = getErrorMessage(error);
			expect(message).to.equal('"simple string error"');
		});

		it('should convert number to error message', () => {
			const error = 42;
			const message = getErrorMessage(error);
			expect(message).to.equal('42');
		});

		it('should handle null', () => {
			const message = getErrorMessage(null);
			expect(message).to.equal('null');
		});

		it('should handle undefined', () => {
			const message = getErrorMessage(undefined);
			// JSON.stringify(undefined) returns undefined, which creates Error with empty message
			expect(message).to.equal('');
		});
	});

	describe('getErrorStack', () => {
		it('should return stack from Error object', () => {
			const error = new Error('test error');
			const stack = getErrorStack(error);
			expect(stack).to.be.a('string');
			expect(stack).to.include('Error: test error');
		});

		it('should return undefined stack for non-error objects', () => {
			const error = { message: 'no stack' };
			const stack = getErrorStack(error);
			expect(stack).to.be.undefined;
		});
	});

	describe('values that can not be written as JSON', () => {
		it('should fall back to the text of the value', () => {
			const circular: Record<string, unknown> = {};
			circular.self = circular;
			expect(getErrorMessage(circular)).to.equal('[object Object]');
		});
	});
});
