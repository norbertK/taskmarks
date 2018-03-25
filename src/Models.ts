'use strict';

import { File } from './File';

export interface ITask {
  name: string;
  activeFileName: string;
  files: Array<File>;
}

export interface ITasks {
  activeTask: ITask;
  allTasks: Array<ITask>;
}
