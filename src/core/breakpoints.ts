/**
 * Pure logic for the breakpoints of a task - no VS Code dependencies.
 */

import type { IPersistBreakpoint } from '../types';
import { mapLines, type TextChange } from './lineAdjustment';

type Json = Record<string, unknown>;

function isLineOrColumn(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * A breakpoint from any object that has a file path and a line (parsed JSON, the values of a VS Code breakpoint), undefined for anything else.
 * Only what differs from VS Code's default is taken over, always in the same order, so that equal breakpoints serialize equally.
 */
export function toBreakpoint(value: unknown): IPersistBreakpoint | undefined {
	if (typeof value !== 'object' || value === null) {
		return undefined;
	}
	const raw = value as Json;
	if (typeof raw.filepath !== 'string' || raw.filepath === '' || !isLineOrColumn(raw.lineNumber)) {
		return undefined;
	}
	const breakpoint: IPersistBreakpoint = { filepath: raw.filepath, lineNumber: raw.lineNumber };
	if (isLineOrColumn(raw.column) && raw.column > 0) {
		breakpoint.column = raw.column;
	}
	if (raw.enabled === false) {
		breakpoint.enabled = false;
	}
	for (const key of ['condition', 'hitCondition', 'logMessage'] as const) {
		const text = raw[key];
		if (typeof text === 'string' && text !== '') {
			breakpoint[key] = text;
		}
	}
	return breakpoint;
}

/** Same file, line and column: VS Code shows one breakpoint there. */
export function sameLocation(a: IPersistBreakpoint, b: IPersistBreakpoint): boolean {
	return a.filepath === b.filepath && a.lineNumber === b.lineNumber && (a.column ?? 0) === (b.column ?? 0);
}

/** By file, line and column - the order in taskmarks.json, so that it doesn't depend on the order the breakpoints were set in. */
export function sortBreakpoints(breakpoints: IPersistBreakpoint[]): IPersistBreakpoint[] {
	return [...breakpoints].sort((a, b) => {
		if (a.filepath !== b.filepath) {
			return a.filepath < b.filepath ? -1 : 1;
		}
		return a.lineNumber - b.lineNumber || (a.column ?? 0) - (b.column ?? 0);
	});
}

/** The breakpoints of others that are at none of the own locations. */
export function missingBreakpoints(own: IPersistBreakpoint[], others: IPersistBreakpoint[]): IPersistBreakpoint[] {
	const missing: IPersistBreakpoint[] = [];
	for (const other of others) {
		if (![...own, ...missing].some((breakpoint) => sameLocation(breakpoint, other))) {
			missing.push(other);
		}
	}
	return missing;
}

/**
 * The breakpoints after the changes of one change event in a file, undefined if none of them is affected.
 * For breakpoints that VS Code doesn't show at the moment (it moves the ones it shows itself): they follow the same rules as marks
 * (mapLineThroughChange). A breakpoint whose line is gone, or that would end up behind the last line, is removed.
 */
export function moveBreakpoints(
	breakpoints: IPersistBreakpoint[],
	filepath: string,
	changes: TextChange[],
	newLineCount: number
): IPersistBreakpoint[] | undefined {
	const inFile = breakpoints.filter((breakpoint) => breakpoint.filepath === filepath);
	const newLines = mapLines(
		inFile.map((breakpoint) => breakpoint.lineNumber),
		changes
	);
	if (inFile.every((breakpoint, index) => breakpoint.lineNumber === newLines[index] && breakpoint.lineNumber < newLineCount)) {
		return undefined;
	}

	const moved: IPersistBreakpoint[] = [];
	for (const breakpoint of breakpoints) {
		const index = inFile.indexOf(breakpoint);
		if (index === -1) {
			moved.push(breakpoint);
			continue;
		}
		const newLine = newLines[index];
		if (newLine !== undefined && newLine < newLineCount) {
			moved.push({ ...breakpoint, lineNumber: newLine });
		}
	}
	return moved;
}
