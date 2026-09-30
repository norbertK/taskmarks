/**
 * Pure mark line tracking for document edits - no VS Code dependencies.
 */

/** One edit as reported by VS Code: the replaced range (pre-edit coordinates) and the inserted text. */
export interface TextChange {
	startLine: number;
	startCharacter: number;
	endLine: number;
	endCharacter: number;
	text: string;
}

function countNewlines(text: string): number {
	let count = 0;
	for (let i = 0; i < text.length; i++) {
		if (text.charCodeAt(i) === 10) {
			count++;
		}
	}
	return count;
}

/**
 * Where a marked line ends up after one change, or undefined if its line no longer exists on its own.
 *
 * A marked line survives when its content still starts a line after the edit:
 * - lines above the change are untouched, lines below shift by the net line difference
 * - lines strictly inside a multi-line replaced range are gone
 * - the first line of the range survives unless it was deleted from column 0 to column 0 of a later line
 * - the last line of a multi-line range survives only if the edit started a fresh line in front of it
 * - Enter at column 0 of a marked line pushes the mark down with the text
 */
export function mapLineThroughChange(line: number, change: TextChange): number | undefined {
	const { startLine, startCharacter, endLine, endCharacter, text } = change;
	const insertedLines = countNewlines(text);
	const delta = insertedLines - (endLine - startLine);
	const endsWithNewline = text.endsWith('\n');

	if (line < startLine) {
		return line;
	}
	if (line > endLine) {
		return line + delta;
	}

	if (startLine === endLine) {
		const insertBeforeLineStart = startCharacter === 0 && endCharacter === 0 && endsWithNewline;
		return insertBeforeLineStart ? line + insertedLines : line;
	}

	if (line === startLine) {
		const wholeLinesDeleted = startCharacter === 0 && endCharacter === 0;
		return wholeLinesDeleted ? undefined : line;
	}

	if (line === endLine) {
		const startsFreshLine = endsWithNewline || (startCharacter === 0 && text === '');
		return endCharacter === 0 && startsFreshLine ? line + delta : undefined;
	}

	return undefined;
}

/**
 * Map every marked line through all changes of one change event.
 * Returns the new line per input index, or undefined for marks that should be removed.
 *
 * Changes are applied bottom-up, so each change's pre-edit coordinates stay valid.
 * A mark is also removed when it would land outside [0, newLineCount) or on a line an earlier mark already took.
 */
export function mapMarkLines(lines: number[], changes: TextChange[], newLineCount: number): (number | undefined)[] {
	const bottomUp = [...changes].sort((a, b) => b.startLine - a.startLine || b.startCharacter - a.startCharacter);

	const mapped = lines.map((line) => {
		let current: number | undefined = line;
		for (const change of bottomUp) {
			if (current === undefined) {
				break;
			}
			current = mapLineThroughChange(current, change);
		}
		return current;
	});

	const taken = new Set<number>();
	return mapped.map((line) => {
		if (line === undefined || line < 0 || line >= newLineCount || taken.has(line)) {
			return undefined;
		}
		taken.add(line);
		return line;
	});
}

export interface RemovedMark {
	lineNumber: number;
	label: string;
}

/** Marks removed by one edit, with enough of the edit to recognise its undo. */
export interface MarkRemoval {
	startLine: number;
	startCharacter: number;
	replacedLines: number;
	insertedLines: number;
	marks: RemovedMark[];
}

export function createMarkRemoval(change: TextChange, marks: RemovedMark[]): MarkRemoval {
	return {
		startLine: change.startLine,
		startCharacter: change.startCharacter,
		replacedLines: change.endLine - change.startLine,
		insertedLines: countNewlines(change.text),
		marks: marks.map(({ lineNumber, label }) => ({ lineNumber, label })),
	};
}

/**
 * Index of the removal that an undo event reverses, or -1.
 * An undo reverses an edit exactly: at the same start position it replaces the inserted lines with the replaced ones.
 * Only single-change events are matched; the most recent matching removal wins.
 */
export function findUndoneRemoval(removals: MarkRemoval[], undoChanges: TextChange[]): number {
	if (undoChanges.length !== 1) {
		return -1;
	}
	const undo = undoChanges[0];
	for (let i = removals.length - 1; i >= 0; i--) {
		const removal = removals[i];
		if (
			undo.startLine === removal.startLine &&
			undo.startCharacter === removal.startCharacter &&
			undo.endLine - undo.startLine === removal.insertedLines &&
			countNewlines(undo.text) === removal.replacedLines
		) {
			return i;
		}
	}
	return -1;
}
