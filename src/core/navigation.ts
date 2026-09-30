/**
 * Pure navigation and path logic - no VS Code dependencies.
 * The caller handles the actual navigation (showing lines, opening files).
 */

export interface NavigationTarget {
	type: 'line' | 'nextDocument' | 'previousDocument' | 'none';
	lineNumber?: number;
	filepath?: string;
}

/**
 * Find the next mark after the current line in the given line numbers.
 */
export function findNextMark(currentLine: number, lineNumbers: number[]): number | undefined {
	for (const lineNumber of lineNumbers) {
		if (lineNumber > currentLine) {
			return lineNumber;
		}
	}
	return undefined;
}

/**
 * Find the previous mark before the current line in the given line numbers.
 */
export function findPreviousMark(currentLine: number, lineNumbers: number[]): number | undefined {
	for (let i = lineNumbers.length - 1; i >= 0; i--) {
		if (lineNumbers[i] < currentLine) {
			return lineNumbers[i];
		}
	}
	return undefined;
}

/**
 * Find the next file in the ring that has marks.
 * Returns the filepath and first line number, or undefined if none found.
 */
export function findNextFileWithMarks<T extends { filepath: string; lineNumbers: number[] }>(
	files: T[],
	currentIndex: number
): { filepath: string; lineNumber: number } | undefined {
	if (files.length === 0) {return undefined;}

	let index = (currentIndex + 1) % files.length;
	const startIndex = index;

	do {
		const file = files[index];
		if (file.lineNumbers.length > 0) {
			return { filepath: file.filepath, lineNumber: file.lineNumbers[0] };
		}
		index = (index + 1) % files.length;
	} while (index !== startIndex);

	return undefined;
}

/**
 * Find the previous file in the ring that has marks.
 * Returns the filepath and last line number, or undefined if none found.
 */
export function findPreviousFileWithMarks<T extends { filepath: string; lineNumbers: number[] }>(
	files: T[],
	currentIndex: number
): { filepath: string; lineNumber: number } | undefined {
	if (files.length === 0) {return undefined;}

	let index = (currentIndex - 1 + files.length) % files.length;
	const startIndex = index;

	do {
		const file = files[index];
		if (file.lineNumbers.length > 0) {
			return { filepath: file.filepath, lineNumber: file.lineNumbers[file.lineNumbers.length - 1] };
		}
		index = (index - 1 + files.length) % files.length;
	} while (index !== startIndex);

	return undefined;
}
