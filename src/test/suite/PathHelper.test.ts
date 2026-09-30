import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { PathHelper } from '../../PathHelper';

describe('PathHelper', () => {
	describe('basePath', () => {
		it('should get and set basePath', () => {
			PathHelper.basePath = '/test/path';
			expect(PathHelper.basePath).to.equal('/test/path');
		});
	});

	describe('getFullPath', () => {
		beforeEach(() => {
			PathHelper.basePath = 'c:\\temp';
		});

		it('should prepend basePath to filepath', () => {
			const fullPath = PathHelper.getFullPath('\\src\\file.ts');
			expect(fullPath).to.equal('c:\\temp\\src\\file.ts');
		});

		it('should handle empty filepath', () => {
			const fullPath = PathHelper.getFullPath('');
			expect(fullPath).to.equal('c:\\temp');
		});
	});

	describe('reducePath', () => {
		beforeEach(() => {
			PathHelper.basePath = 'c:\\workspace';
		});

		it('should remove basePath from filepath', () => {
			const reduced = PathHelper.reducePath('c:\\workspace\\src\\file.ts');
			expect(reduced).to.equal('\\src\\file.ts');
		});

		it('should return original path if basePath not present', () => {
			const reduced = PathHelper.reducePath('d:\\other\\path\\file.ts');
			expect(reduced).to.equal('d:\\other\\path\\file.ts');
		});

		it('should handle exact basePath match', () => {
			const reduced = PathHelper.reducePath('c:\\workspace');
			expect(reduced).to.equal('');
		});
	});

	describe('replaceAll', () => {
		it('should replace all occurrences of a string', () => {
			const result = PathHelper.replaceAll('hello world world', 'world', 'universe');
			expect(result).to.equal('hello universe universe');
		});

		it('should handle no matches', () => {
			const result = PathHelper.replaceAll('hello world', 'foo', 'bar');
			expect(result).to.equal('hello world');
		});

		it('should handle empty string', () => {
			const result = PathHelper.replaceAll('', 'foo', 'bar');
			expect(result).to.equal('');
		});

		it('should replace special JSON property names', () => {
			const json = '{"marks": [1,2], "marks": [3,4]}';
			const result = PathHelper.replaceAll(json, '"marks"', '"lineNumbers"');
			expect(result).to.equal('{"lineNumbers": [1,2], "lineNumbers": [3,4]}');
		});
	});
});
