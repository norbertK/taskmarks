import { describe, it } from 'mocha';
import { expect } from 'chai';
import {
	detectPathCharacters,
	getFullPath,
	reducePath,
	replaceAll,
	normalizePath,
} from '../../core/paths';

describe('Paths (pure)', () => {
	describe('detectPathCharacters', () => {
		it('should detect Unix-style paths', () => {
			const result = detectPathCharacters('/home/user/project');
			expect(result.active).to.equal('/');
			expect(result.inactive).to.equal('\\');
		});

		it('should detect Windows-style paths', () => {
			const result = detectPathCharacters('C:\\Users\\user\\project');
			expect(result.active).to.equal('\\');
			expect(result.inactive).to.equal('/');
		});

		it('should default to Windows for paths without slashes', () => {
			const result = detectPathCharacters('filename.txt');
			expect(result.active).to.equal('\\');
			expect(result.inactive).to.equal('/');
		});

		it('should prefer Unix when both are present (Unix first)', () => {
			const result = detectPathCharacters('/path/with\\mixed');
			expect(result.active).to.equal('/');
		});
	});

	describe('getFullPath', () => {
		it('should combine basePath and filepath', () => {
			expect(getFullPath('/workspace', '/src/file.ts')).to.equal('/workspace/src/file.ts');
		});

		it('should handle empty filepath', () => {
			expect(getFullPath('/workspace', '')).to.equal('/workspace');
		});

		it('should handle Windows paths', () => {
			expect(getFullPath('C:\\workspace', '\\src\\file.ts')).to.equal('C:\\workspace\\src\\file.ts');
		});
	});

	describe('reducePath', () => {
		it('should remove basePath prefix', () => {
			expect(reducePath('/workspace', '/workspace/src/file.ts')).to.equal('/src/file.ts');
		});

		it('should return original if basePath not present', () => {
			expect(reducePath('/workspace', '/other/path')).to.equal('/other/path');
		});

		it('should handle exact match', () => {
			expect(reducePath('/workspace', '/workspace')).to.equal('');
		});

		it('should handle Windows paths', () => {
			expect(reducePath('C:\\workspace', 'C:\\workspace\\src\\file.ts')).to.equal('\\src\\file.ts');
		});
	});

	describe('replaceAll', () => {
		it('should replace all occurrences', () => {
			expect(replaceAll('a/b/c/d', '/', '\\')).to.equal('a\\b\\c\\d');
		});

		it('should handle no matches', () => {
			expect(replaceAll('hello', 'x', 'y')).to.equal('hello');
		});

		it('should handle empty string', () => {
			expect(replaceAll('', 'a', 'b')).to.equal('');
		});
	});

	describe('normalizePath', () => {
		it('should convert Unix to Windows', () => {
			expect(normalizePath('/src/file.ts', '/', '\\')).to.equal('\\src\\file.ts');
		});

		it('should convert Windows to Unix', () => {
			expect(normalizePath('\\src\\file.ts', '\\', '/')).to.equal('/src/file.ts');
		});

		it('should handle mixed paths', () => {
			expect(normalizePath('/src\\file.ts', '\\', '/')).to.equal('/src/file.ts');
		});
	});
});
