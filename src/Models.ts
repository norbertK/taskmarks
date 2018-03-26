'use strict';

import { File } from './File';

export interface ITask {
  name: string;
  activeFileName: string | undefined;
  files: Array<File>;
}

export interface ITasks {
  activeTask: ITask | undefined;
  allTasks: Array<ITask>;
}
