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
 * Check whether a full path lies inside basePath (and is not basePath itself).
 * Only such paths can be stored relative to basePath.
 */
export function isInsideBasePath(basePath: string, filepath: string): boolean {
	if (basePath === '' || !filepath.startsWith(basePath)) {
		return false;
	}
	const rest = filepath.substring(basePath.length);
	// without the separator check, /workspace2/a.ts would count as inside /workspace
	return /[\\/]$/.test(basePath) ? rest.length > 0 : /^[\\/]./.test(rest);
}

/**
 * Reduce a full path to a path relative to basePath (with a leading separator).
 * A path outside basePath is returned unchanged.
 */
export function reducePath(basePath: string, filepath: string): string {
	return isInsideBasePath(basePath, filepath) ? filepath.substring(basePath.replace(/[\\/]$/, '').length) : filepath;
}
