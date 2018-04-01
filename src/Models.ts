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

interface IPersistFile {
  filepath: string;
  marks: Array<number>;
}

interface IPersistTask {
  name: string;
  files: Array<IPersistFile>;
}

interface IPersistTasks {
  activeTaskName: string;
  tasks: Array<IPersistTask>;
}
