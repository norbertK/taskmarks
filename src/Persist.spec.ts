import { PathHelper } from './PathHelper';
import * as fs from 'fs';
import { TaskManager } from './TaskManager';
import { Persist } from './Persist';

jest.mock('PathHelper');

// fs.readFileSync = jest.fn();

const basePath = 'c:\\temp';
const markPath = '\\src\\Mark.ts';
const fullMarkPath = 'c:\\temp\\src\\Mark.ts';

const taskmarksjson =
  '{"activeTaskName": "test paste","tasks": [{"name": "default","files": []},{"name": "test paste","files": [{"filepath": "\\\\README.MD","lineNumbers": [13,15,19,34]},{"filepath": "\\\\LICENSE","lineNumbers": [11]}]}]}';
const taskManager = TaskManager.instance;

describe('Persist Tests', () => {
  // PathHelper.basePath = basePath;

  // require('fs').__setMockJson(taskmarksjson);
  // beforeEach(() => {
  //   // Set up some mocked out file info before each test
  //   require('fs').__setMockFiles(MOCK_FILE_INFO);
  // });

  jest.spyOn(PathHelper, 'getTaskmarksJson').mockReturnValue(taskmarksjson);
  Persist.initAndLoad(taskManager);

  it('an empty path', () => {
    expect().toBe(basePath);
  });

  it('a longer path', () => {
    expect(PathHelper.getFullPath(markPath)).toBe(fullMarkPath);
  });

  it('reducePath', () => {
    expect(PathHelper.reducePath(fullMarkPath)).toBe(markPath);
  });

  // todo still no idea how to mock vscode returns - same problem testing persist
  // it('blaaaah', () => {
  //   expect(PathHelper.getTaskmarksJson()).toBe(taskmarksjson);
  // });
});
