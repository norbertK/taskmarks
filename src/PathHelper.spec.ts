import { PathHelper } from './PathHelper';
import * as fs from 'fs';
import { taskmarksJson } from './JestHelpers';

jest.mock('fs');

// fs.readFileSync = jest.fn();

const basePath = 'c:\\temp';
const markPath = '\\src\\Mark.ts';
const fullMarkPath = 'c:\\temp\\src\\Mark.ts';

describe('PathHelper Tests', () => {
  PathHelper.basePath = basePath;

  // require('fs').__setMockJson(taskmarksjson);
  // beforeEach(() => {
  //   // Set up some mocked out file info before each test
  //   require('fs').__setMockFiles(MOCK_FILE_INFO);
  // });

  jest.spyOn(fs, 'readFileSync').mockReturnValue(taskmarksJson);

  it('an empty path', () => {
    expect(PathHelper.getFullPath('')).toBe(basePath);
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
