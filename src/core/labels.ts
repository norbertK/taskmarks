/**
 * Rules for labels: the label that is offered for a new mark, and the labels of two marks on the same line - no VS Code dependencies.
 */

/**
 * A symbol as a document symbol provider of VS Code reports it: a DocumentSymbol (a tree, selectionRange is the name)
 * or the older SymbolInformation (a flat list, location.range is the whole symbol).
 */
export interface LabelSymbol {
	name: string;
	selectionRange?: { start: { line: number; character: number } };
	location?: { range: { start: { line: number; character: number } } };
	children?: LabelSymbol[];
}

/**
 * The name of the method, class ... that is declared in the line (counted from 0), '' if there is none.
 * Of several symbols in one line it is the leftmost one.
 * Only the name: some languages report a symbol with its signature or type ("Save(Config) : void", "_path : string" in C#),
 * that is cut off.
 */
export function suggestLabel(symbols: LabelSymbol[] | undefined | null, line: number): string {
	let name = '';
	let character = Infinity;
	const visit = (list: LabelSymbol[]): void => {
		for (const symbol of list) {
			const start = symbol.selectionRange?.start ?? symbol.location?.range.start;
			const symbolName = symbol.name?.trim() ?? '';
			if (start?.line === line && start.character < character && symbolName) {
				name = symbolName.split(/\(|\s:\s/)[0].trim() || symbolName;
				character = start.character;
			}
			visit(symbol.children ?? []);
		}
	};
	visit(symbols ?? []);
	return name;
}

/**
 * A label that is already to read in its line (the name of the method that is declared there, as suggestLabel offers it)
 * says nothing new behind that line.
 */
export function labelRepeatsLine(label: string, lineText: string): boolean {
	return label !== '' && lineText.includes(label);
}

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
