export interface IPersistFile {
  filepath: string;
  lineNumbers: number[];
}

export interface IPersistTask {
  name: string;
  files: IPersistFile[];
}

export interface IPersistTasks {
  activeTaskName: string;
  tasks: IPersistTask[];
}
