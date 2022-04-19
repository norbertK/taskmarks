import { PathHelper } from './PathHelper';
import * as fs from 'fs';
import { taskmarksJson } from './JestHelpers';

jest.mock('fs');

const basePath = 'c:\\temp';
const markPath = '\\src\\Mark.ts';
const fullMarkPath = 'c:\\temp\\src\\Mark.ts';

describe('PathHelper Tests', () => {
  PathHelper.basePath = basePath;

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
