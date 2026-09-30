/**
 * Pure path utilities - no VS Code or file system dependencies.
 */

export interface PathCharacters {
	active: string;
	inactive: string;
}

/**
 * Detect path separator characters based on the path format.
 * Returns active (the one used in the path) and inactive (the other one).
 */
export function detectPathCharacters(path: string): PathCharacters {
	if (path.indexOf('/') > -1) {
		return { active: '/', inactive: '\\' };
	}
	return { active: '\\', inactive: '/' };
}

/**
 * Get the full path by prepending basePath to a relative filepath.
 */
export function getFullPath(basePath: string, filepath: string): string {
	return basePath + filepath;
}

/**
 * Reduce a full path by removing the basePath prefix.
 */
export function reducePath(basePath: string, filepath: string): string {
	if (filepath.startsWith(basePath)) {
		return filepath.substring(basePath.length);
	}
	return filepath;
}

/**
 * Replace all occurrences of a substring.
 */
export function replaceAll(str: string, search: string, replacement: string): string {
	return str.replaceAll(search, replacement);
}

/**
 * Normalize path separators in a filepath.
 */
export function normalizePath(filepath: string, fromChar: string, toChar: string): string {
	return filepath.replaceAll(fromChar, toChar);
}
