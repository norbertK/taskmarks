export interface IPersistTaskManager {
	activeTaskName: string;
	persistTasks: IPersistTask[];
}

export interface IPersistTask {
	name: string;
	persistFiles: IPersistFile[];
}

export interface IPersistFile {
	filepath: string;
	persistMarks: IPersistMark[];
}

export interface IPersistMark {
	lineNumber: number;
	label: string;
}

export interface PathMark {
	filepath: string;
	lineNumber: number;
	label: string;
}
