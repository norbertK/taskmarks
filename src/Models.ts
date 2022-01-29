'use strict';

// import { File } from './File';

// export interface ITask {
//   name: string;
//   activeFileName: string | undefined;
//   files: Array<File>;
// }

// export interface ITasks {
//   activeTask: ITask | undefined;
//   allTasks: Array<ITask>;
// }

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
