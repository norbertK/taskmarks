export interface IPersistFile {
  filepath: string;
  marks: number[];
}

export interface IPersistTask {
  name: string;
  files: IPersistFile[];
}

export interface IPersistTasks {
  activeTaskName: string;
  tasks: IPersistTask[];
}
