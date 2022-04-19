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
  lineNumbers: number[];
}

export interface PathMark {
  fullPath: string;
  lineNumber: number;
}
