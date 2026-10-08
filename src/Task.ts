import { File } from './File';
import { PathHelper } from './PathHelper';
import type { IPersistBreakpoint, IPersistTask } from './types';
import type { LabelConflictChoice } from './core/labels';
import { missingBreakpoints } from './core/breakpoints';

export class Task {
	private _name: string;
	// the file in the active editor - only part of _files while it has marks
	private _activeFile: File | undefined;
	// the files with marks, in the order they got their first mark
	private _files: File[];
	// The breakpoints the task shares with the team in taskmarks.json: a copy made by "Share Breakpoints of Active Task".
	// The breakpoints that VS Code shows for the task are kept per user (Breakpoints.ts) and are not part of the task.
	sharedBreakpoints: IPersistBreakpoint[] = [];

	constructor(name: string) {
		this._name = name;
		this._files = [];
	}

	get name(): string {
		return this._name;
	}

	set name(name: string) {
		this._name = name;
	}

	get activeFile(): File | undefined {
		return this._activeFile;
	}

	get files(): File[] {
		return this._files;
	}

	mergeFilesWithPersistFiles(persistTaskToMerge: IPersistTask, labelConflict: LabelConflictChoice = 'keep'): void {
		if (!persistTaskToMerge?.persistFiles) {
			return;
		}
		for (const persistFile of persistTaskToMerge.persistFiles) {
			const file = this.getOrCreateFile(persistFile.filepath);
			file.mergeMarks(persistFile.persistMarks, labelConflict);
			this.syncFile(file);
		}
		this.sharedBreakpoints = [...this.sharedBreakpoints, ...missingBreakpoints(this.sharedBreakpoints, persistTaskToMerge.persistBreakpoints ?? [])];
	}

	// how many marks of the other task have another label than the mark this task has on that line
	countLabelConflicts(persistTask: IPersistTask): number {
		return persistTask.persistFiles.reduce(
			(count, persistFile) => count + (this.getFile(persistFile.filepath)?.countLabelConflicts(persistFile.persistMarks) ?? 0),
			0
		);
	}

	lineHasMark(filename: string, lineNumber: number): boolean {
		return this.getFile(PathHelper.reducePath(filename))?.hasMark(lineNumber) ?? false;
	}

	toggle(filename: string, lineNumber: number, label: string): void {
		const file = this.getOrCreateFile(PathHelper.reducePath(filename));
		file.toggleTaskMark({ lineNumber, label });
		this.syncFile(file);
	}

	use(path: string): File {
		this._activeFile = this.getOrCreateFile(PathHelper.reducePath(path));
		return this._activeFile;
	}

	// call after the marks of a file were changed: adds the file with its first mark, removes it with its last
	syncFile(file: File): void {
		const index = this._files.indexOf(file);
		if (file.hasMarks && index === -1) {
			this._files.push(file);
		} else if (!file.hasMarks && index > -1) {
			this._files.splice(index, 1);
		}
	}

	getFile(reducedFilePath: string): File | undefined {
		return this._files.find((file) => file.filepath === reducedFilePath);
	}

	get hasMarks(): boolean {
		return this._files.some((file) => file.hasMarks);
	}

	// the file of the task with this path. A new file is not part of the task until it has marks (syncFile)
	getOrCreateFile(reducedFilePath: string): File {
		const file = this.getFile(reducedFilePath);
		if (file) {
			return file;
		}
		// reuse the active file, so the active editor and the task keep working on the same object
		if (this._activeFile?.filepath === reducedFilePath) {
			return this._activeFile;
		}
		return new File(reducedFilePath);
	}
}
