export function mockFunction<T extends (...args: any[]) => any>(
  fn: T
): jest.MockedFunction<T> {
  return fn as jest.MockedFunction<T>;
}

export const taskmarksJson = `
  {
    "activeTaskName": "testActive",
      "tasks": [
        {
          "name": "default",
          "files": [
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
          "files": [
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
