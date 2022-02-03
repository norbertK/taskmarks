'use strict';

export interface IPersistFile {
  filepath: string;
  marks: Array<number>;
}

export interface IPersistTask {
  name: string;
  files: Array<IPersistFile>;
}

export interface IPersistTasks {
  activeTaskName: string;
  tasks: Array<IPersistTask>;
}
