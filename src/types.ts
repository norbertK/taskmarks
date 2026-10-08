export interface IPersistTaskManager {
	version?: number;
	activeTaskName: string;
	persistTasks: IPersistTask[];
}

export interface IPersistTask {
	name: string;
	persistFiles: IPersistFile[];
	// only written while the task shares breakpoints - a file with this field has version 3
	persistBreakpoints?: IPersistBreakpoint[];
}

export interface IPersistFile {
	filepath: string;
	persistMarks: IPersistMark[];
}

export interface IPersistMark {
	lineNumber: number;
	label: string;
}

// a breakpoint in a line of a file. What VS Code's default has is left out: column 0, enabled, no condition ...
export interface IPersistBreakpoint {
	filepath: string;
	lineNumber: number;
	column?: number;
	enabled?: false;
	condition?: string;
	hitCondition?: string;
	logMessage?: string;
}
