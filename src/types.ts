export interface IPersistTaskManager {
  activeTaskName: string;
  tasks: IPersistTask[];
}

export interface IPersistTask {
  name: string;
  files: IPersistFile[];
}

export interface IPersistFile {
  filepath: string;
  lineNumbers: number[];
}

export interface PathMark {
  fullPath: string;
  lineNumber: number;
}
