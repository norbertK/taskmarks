import { PathHelper } from './PathHelper';
// import * as fss from 'fs';

jest.mock('fs');

// Using only jest.fn
// fss.readFileSync = jest.fn();

const basePath = 'c:\\temp';
const markPath = '\\src\\Mark.ts';
const fullMarkPath = 'c:\\temp\\src\\Mark.ts';

const taskmarksjson =
  '{"activeTaskName": "test paste","tasks": [{"name": "default","files": []},{"name": "test paste","files": [{"filepath": "\\\\README.MD","lineNumbers": [13,15,19,34]},{"filepath": "\\\\LICENSE","lineNumbers": [11]}]}]}';

describe('PathHelper Tests', () => {
  PathHelper.basePath = basePath;

  require('fs').__setMockJson(taskmarksjson);
  // beforeEach(() => {
  //   // Set up some mocked out file info before each test
  //   require('fs').__setMockFiles(MOCK_FILE_INFO);
  // });

  it('an empty path', () => {
    expect(PathHelper.getFullPath('')).toBe(basePath);
  });

  it('a longer path', () => {
    expect(PathHelper.getFullPath(markPath)).toBe(fullMarkPath);
  });

  it('reducePath', () => {
    expect(PathHelper.reducePath(fullMarkPath)).toBe(markPath);
  });

  it('blaaaah', () => {
    expect(PathHelper.getTaskmarksJson()).toBe(taskmarksjson);
  });
});
