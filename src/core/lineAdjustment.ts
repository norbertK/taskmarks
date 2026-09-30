/**
 * Pure line adjustment logic for marks when document content changes.
 * Extracted from Helper.initChangeHandler() for testability.
 */

export interface MarkLineNumber {
	lineNumber: number;
}

export interface LineAdjustmentResult {
	adjusted: MarkLineNumber[];
	removed: MarkLineNumber[];
}

/**
 * Adjust mark line numbers when lines are inserted or deleted.
 *
 * @param marks - Array of marks with lineNumber property
 * @param changeStartLine - The line where the change started (0-based)
 * @param lineDiff - Number of lines added (positive) or removed (negative)
 * @param newDocumentLineCount - The new total line count of the document
 * @returns Object with adjusted marks and marks that should be removed
 *
 * Rules:
 * - Marks before changeStartLine are unchanged
 * - Marks after changeStartLine are shifted by lineDiff
 * - Marks that would end up with negative line numbers are removed
 * - Marks that would end up beyond document bounds are removed
 * - Marks IN the deleted range [changeStartLine, changeStartLine + |lineDiff|) are removed
 */
export function adjustMarkLineNumbers<T extends MarkLineNumber>(
	marks: T[],
	changeStartLine: number,
	lineDiff: number,
	newDocumentLineCount: number
): { adjusted: T[]; removed: T[] } {
	const adjusted: T[] = [];
	const removed: T[] = [];

	// When lines are deleted, the deleted range is [changeStartLine, changeStartLine + deletedCount)
	const deletedRangeEnd = lineDiff < 0 ? changeStartLine + Math.abs(lineDiff) : changeStartLine;

	for (const mark of marks) {
		// Check if mark is in deleted range (only applicable when deleting)
		if (lineDiff < 0 && mark.lineNumber >= changeStartLine && mark.lineNumber < deletedRangeEnd) {
			removed.push(mark);
			continue;
		}

		if (mark.lineNumber <= changeStartLine) {
			// Mark is at or before the change - keep it unchanged
			// But check if it's still within document bounds
			if (mark.lineNumber < newDocumentLineCount) {
				adjusted.push(mark);
			} else {
				removed.push(mark);
			}
		} else {
			// Mark is after the change (or after deleted range) - needs adjustment
			const newLineNumber = mark.lineNumber + lineDiff;

			if (newLineNumber < 0) {
				// Would go negative - remove it
				removed.push(mark);
			} else if (newLineNumber >= newDocumentLineCount) {
				// Would be beyond document end - remove it
				removed.push(mark);
			} else {
				// Valid adjustment
				mark.lineNumber = newLineNumber;
				adjusted.push(mark);
			}
		}
	}

	return { adjusted, removed };
}
