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
              "marks": [{"lineNumber":115, "label": ""}, {"lineNumber":134, "label": ""}]
            },{
              "filepath": "\\\\DUMMY",
              "marks": [{"lineNumber":111, "label": ""}]
            }
          ]
        },
        {
          "name": "testActive",
          "persistFiles": [
            {
              "filepath": "\\\\README.MD",
              "marks": [{"lineNumber":13, "label": ""},{"lineNumber":15, "label": ""},{"lineNumber":19, "label": ""},{"lineNumber":34, "label": ""}]
            },{
              "filepath": "\\\\LICENSE",
              "marks": [{"lineNumber":11, "label": ""}]
            }
          ]
        }
      ]
    }
  `;

export const andAnotherTask: IPersistTask = {
  name: 'and another task',
  persistFiles: [
    {
      filepath: '\\\\DUMMY.MD',
      persistMarks: [
        { lineNumber: 115, label: '' },
        { lineNumber: 134, label: '' },
      ],
    },
    {
      filepath: '\\\\DUMMY',
      persistMarks: [{ lineNumber: 111, label: '' }],
    },
  ],
};
