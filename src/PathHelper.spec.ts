import { PathHelper } from './PathHelper';

jest.mock('fs');

const basePath = 'c:\\temp';
const markPath = '\\src\\Mark.ts';
const fullMarkPath = 'c:\\temp\\src\\Mark.ts';

describe('PathHelper Tests', () => {
  PathHelper.basePath = basePath;

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
});
