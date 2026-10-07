import { File } from './File';
import { PathHelper } from './PathHelper';
import type { IPersistTask } from './types';

export class Task {
	private _name: string;
	// the file in the active editor - only part of _files while it has marks
	private _activeFile: File | undefined;
	// the files with marks, in the order they got their first mark
	private _files: File[];

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

	mergeFilesWithPersistFiles(persistTaskToMerge: IPersistTask): void {
		if (!persistTaskToMerge?.persistFiles) {
			return;
		}
		for (const persistFile of persistTaskToMerge.persistFiles) {
			const file = this._getOrCreateFile(persistFile.filepath);
			file.mergeMarks(persistFile.persistMarks);
			this.syncFile(file);
		}
	}

	lineHasMark(filename: string, lineNumber: number): boolean {
		return this.getFile(PathHelper.reducePath(filename))?.hasMark(lineNumber) ?? false;
	}

	toggle(filename: string, lineNumber: number, label: string): void {
		const file = this._getOrCreateFile(PathHelper.reducePath(filename));
		file.toggleTaskMark({ lineNumber, label });
		this.syncFile(file);
	}

	use(path: string): File {
		this._activeFile = this._getOrCreateFile(PathHelper.reducePath(path));
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

	private _getOrCreateFile(reducedFilePath: string): File {
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
