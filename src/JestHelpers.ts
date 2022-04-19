import { IPersistTask } from './types';

export function mockFunction<T extends (...args: any[]) => any>(
  fn: T
): jest.MockedFunction<T> {
  return fn as jest.MockedFunction<T>;
}

export const taskmarksJson = `
  {
    "activeTaskName": "testActive",
      "persistTasks": [
        {
          "name": "default",
          "persistFiles": [
            {
              "filepath": "\\\\DUMMY.MD",
              "lineNumbers": [115,134]
            },{
              "filepath": "\\\\DUMMY",
              "lineNumbers": [111]
            }
          ]
        },
        {
          "name": "testActive",
          "persistFiles": [
            {
              "filepath": "\\\\README.MD",
              "lineNumbers": [13,15,19,34]
            },{
              "filepath": "\\\\LICENSE",
              "lineNumbers": [11]
            }
          ]
        }
      ]
    }
  `;

export const andAnotherTask: IPersistTask = {
  name: 'and another task',
  persistFiles: [],
};
