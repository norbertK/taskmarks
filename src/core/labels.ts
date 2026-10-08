/**
 * Rules for the labels of two marks on the same line - no VS Code dependencies.
 */

/** What to do with a label when a mark is merged into a line that already has a labelled mark. */
export type LabelConflictChoice = 'keep' | 'take' | 'combine';

/**
 * Two marks for one line only disagree if both have a label and the labels differ.
 * A mark without label never wins over one with a label, so that is not a conflict.
 */
export function isLabelConflict(mine: string, theirs: string): boolean {
	return mine !== '' && theirs !== '' && mine !== theirs;
}

/**
 * "mine / theirs" - unless one label already contains the other one,
 * so that merging the same marks twice doesn't repeat a label.
 */
export function combineLabels(mine: string, theirs: string): string {
	if (theirs === '' || mine.includes(theirs)) {
		return mine;
	}
	if (mine === '' || theirs.includes(mine)) {
		return theirs;
	}
	return `${mine} / ${theirs}`;
}

/** The label a mark has after the merge. */
export function mergeLabels(mine: string, theirs: string, choice: LabelConflictChoice): string {
	if (!isLabelConflict(mine, theirs)) {
		return mine || theirs;
	}
	if (choice === 'take') {
		return theirs;
	}
	return choice === 'combine' ? combineLabels(mine, theirs) : mine;
}
