import type { IPersistMark } from './types';
import { Mark } from './Mark';
import { isLabelConflict, mergeLabels, type LabelConflictChoice } from './core/labels';

export class File {
	private _filepath: string;
	private _marks: Mark[] = [];

	get filepath(): string {
		return this._filepath;
	}

	get marks(): Mark[] {
		return this._marks;
	}

	get allPersistMarks(): IPersistMark[] {
		return this._marks.map((mark) => {
			return {
				lineNumber: mark.lineNumber,
				label: mark.label,
			};
		});
	}

	get lineNumbers(): number[] {
		return this._marks.map((mark) => mark.lineNumber);
	}

	constructor(filePath: string) {
		this._filepath = filePath;
	}

	// adds a mark for every line that has none yet and keeps the marks sorted by line
	// on a line that already has a mark, a missing label is taken over; for two labels that differ, labelConflict decides
	mergeMarks(persistMarks: IPersistMark[], labelConflict: LabelConflictChoice = 'keep'): void {
		for (const { lineNumber, label } of persistMarks) {
			const existing = this._marks.find((mark) => mark.lineNumber === lineNumber);
			if (!existing) {
				this._marks.push(new Mark(lineNumber, label));
			} else {
				existing.label = mergeLabels(existing.label, label, labelConflict);
			}
		}
		this._marks.sort((first, second) => first.lineNumber - second.lineNumber);
	}

	// how many of the marks have another label than the mark this file has on that line
	countLabelConflicts(persistMarks: IPersistMark[]): number {
		return persistMarks.filter(({ lineNumber, label }) => isLabelConflict(this.getMark(lineNumber)?.label ?? '', label)).length;
	}

	addMark(persistMark: IPersistMark): void {
		this.mergeMarks([persistMark]);
	}

	getMark(lineNumber: number): Mark | undefined {
		return this._marks.find((mark) => mark.lineNumber === lineNumber);
	}

	hasMark(lineNumber: number): boolean {
		return this._marks.some((mark) => mark.lineNumber === lineNumber);
	}

	toggleTaskMark(persistMark: IPersistMark): void {
		const index = this._marks.findIndex((mark) => mark.lineNumber === persistMark.lineNumber);
		if (index > -1) {
			this._marks.splice(index, 1);
		} else {
			this.addMark(persistMark);
		}
	}

	removeMarks(marksToRemove: Mark[]): void {
		this._marks = this._marks.filter((mark) => !marksToRemove.includes(mark));
	}

	get hasMarks(): boolean {
		return this._marks.length > 0;
	}
}
