import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';

import { File } from '../../File';
import { Mark } from '../../Mark';
import { IPersistFile, IPersistMark } from '../../types';

let firstFile: File;

describe('File', () => {
  const filePath = 'test.js';
  const lineNumber = 1;
  const label = 'test mark';
  let file: File;

  beforeEach(() => {
    firstFile = new File(filePath, lineNumber, label);
  });

  describe('allPersistMarks', () => {
    it('should return an array of IPersistMark objects representing all marks in the file', () => {
      const filePath = 'example/file/path';
      const lineNumber1 = 1;
      const label1 = 'Example Label 1';
      //   const mark1 = new Mark(filePath, lineNumber1, label1);
      const lineNumber2 = 5;
      const label2 = 'Example Label 2';
      //   const mark2 = new Mark(filePath, lineNumber2, label2);
      const file = new File(filePath);
      file.addMark({ lineNumber: lineNumber1, label: label1 });
      file.addMark({ lineNumber: lineNumber2, label: label2 });

      const persistMarks = file.allPersistMarks;

      expect(persistMarks).to.eql([
        { lineNumber: lineNumber1, label: label1 },
        { lineNumber: lineNumber2, label: label2 },
      ]);
    });
  });

  describe('quickPickItems', () => {
    it('returns an empty array when there are no marks with quickPickItem', () => {
      const file = new File('test.ts');
      expect(file.quickPickItems).to.eql([]);
    });

    // todo test quickPickItems
    // it('returns an array of quickPickItems when there are marks with quickPickItem', () => {
    //   const file = new File('test.ts');
    //   const mark1 = new Mark('test.ts', 1, 'Mark 1');
    //   const mark2 = new Mark('test.ts', 2, 'Mark 2');
    //   file.mergeMarksAndLineNumbers([
    //     { lineNumber: mark1.lineNumber, label: mark1.label },
    //     { lineNumber: mark2.lineNumber, label: mark2.label },
    //   ]);

    //   expect(file.quickPickItems).to.eql([
    //     mark1.quickPickItem,
    //     mark2.quickPickItem,
    //   ]);
    // });
  });

  describe('a File', () => {
    it('should have a filepath and an empty number array', () => {
      //   firstFile = new File(filePath, lineNumber, label);
      expect(firstFile.filepath).to.eql('test.js');
      expect(firstFile.lineNumbers).to.eql([1]);
    });
  });

  describe('constructor', () => {
    it('should initialize with filepath and no marks if line number is not provided', () => {
      const filePath = '/path/to/file.txt';
      const file = new File(filePath);
      expect(file.filepath).to.eql(filePath);
      expect(file.marks).to.eql([]);
    });

    it('should initialize with filepath and a new mark if line number is provided', () => {
      const filePath = '/path/to/file.txt';
      const lineNumber = 10;
      const label = 'Test label';
      const file = new File(filePath, lineNumber, label);
      expect(file.filepath).to.eql(filePath);
      expect(file.marks).to.eql([new Mark(filePath, lineNumber, label)]);
    });
  });

  describe('mergeMarksAnd_PersistFile_', () => {
    it('should return the same file if persistFile is undefined', () => {
      const filePath = '/path/to/file.txt';
      const file = new File(filePath);
      const persistFile = undefined;
      const mergedFile = file.mergeMarksAnd_PersistFile_(
        persistFile as unknown as IPersistFile
      );
      expect(mergedFile).to.eql(file);
    });

    it('should merge the persist marks with existing marks in the file', () => {
      const filePath = '/path/to/file.txt';
      const file = new File(filePath);
      const persistMarks = [
        { lineNumber: 10, label: 'Test label 1' },
        { lineNumber: 20, label: 'Test label 2' },
      ] as IPersistMark[];
      const mergedFile = file.mergeMarksAnd_PersistFile_({
        filepath: '',
        persistMarks: persistMarks,
      });
      expect(mergedFile.marks).to.eql([
        new Mark(filePath, 10, 'Test label 1'),
        new Mark(filePath, 20, 'Test label 2'),
      ]);
    });
  });

  describe('addMark', () => {
    it('should add a new mark to the file', () => {
      const filePath = '/path/to/file.txt';
      const file = new File(filePath);
      const lineNumber = 10;
      const label = 'Test label';
      file.addMark({ lineNumber, label });
      expect(file.marks).to.eql([new Mark(filePath, lineNumber, label)]);
    });
  });

  describe('hasMark', () => {
    it('should return true if a mark with the given line number exists in the file', () => {
      const filePath = '/path/to/file.txt';
      const lineNumber = 10;
      const label = 'Test label';
      const file = new File(filePath, lineNumber, label);
      expect(file.hasMark(lineNumber)).to.eql(true);
    });

    it('should return false if a mark with the given line number does not exist in the file', () => {
      const filePath = '/path/to/file.txt';
      const lineNumber = 10;
      const label = 'Test label';
      const file = new File(filePath, lineNumber, label);
      expect(file.hasMark(20)).to.eql(false);
    });
  });

  describe('toggleTaskMark', () => {
    it('should remove a mark if it already exists in the file', () => {
      const filePath = '/path/to/file.txt';
      const lineNumber = 10;
      const label = 'Test label';
      const file = new File(filePath, lineNumber, label);
      expect(file.marks).to.eql([new Mark(filePath, lineNumber, label)]);
      file.toggleTaskMark({ lineNumber, label: '' });
      expect(file.marks).to.eql([]);
    });
  });

  describe('after adding an array of lineNumbers (numbers)', () => {
    it('lineNumbers should return these numbers (ordered, no doubles)', () => {
      firstFile.mergeMarksAndLineNumbers([
        { lineNumber: 20, label: '' },
        { lineNumber: 30, label: '' },
        { lineNumber: 10, label: '' },
        { lineNumber: 20, label: '' },
        { lineNumber: 30, label: '' },
      ]);
      expect(firstFile.allPathMarks).to.eql([
        {
          filepath: 'test.js',
          label: 'test mark',
          lineNumber: 1,
        },
        { filepath: 'test.js', lineNumber: 10, label: '' },
        { filepath: 'test.js', lineNumber: 20, label: '' },
        { filepath: 'test.js', lineNumber: 30, label: '' },
      ]);
    });
  });

  it('after adding a second array of lineNumbers (numbers), lineNumbers should return the combined numbers', () => {
    firstFile.mergeMarksAndLineNumbers([
      { lineNumber: 20, label: '' },
      { lineNumber: 30, label: '' },
      { lineNumber: 10, label: '' },
      { lineNumber: 20, label: '' },
      { lineNumber: 30, label: '' },
    ]);
    firstFile.mergeMarksAndLineNumbers([
      { lineNumber: 20, label: '' },
      { lineNumber: 50, label: '' },
      { lineNumber: 40, label: '' },
      { lineNumber: 50, label: '' },
    ]);
    expect(firstFile.lineNumbers).to.eql([1, 10, 20, 30, 40, 50]);
    expect(firstFile.hasMarks).to.eql(true);
  });

  it('after adding an existing lineNumber, nothing should change (ordered, no doubles)', () => {
    firstFile.mergeMarksAndLineNumbers([
      { lineNumber: 20, label: '' },
      { lineNumber: 30, label: '' },
      { lineNumber: 10, label: '' },
      { lineNumber: 20, label: '' },
      { lineNumber: 30, label: '' },
    ]);
    firstFile.mergeMarksAndLineNumbers([
      { lineNumber: 20, label: '' },
      { lineNumber: 50, label: '' },
      { lineNumber: 40, label: '' },
      { lineNumber: 50, label: '' },
    ]);
    firstFile.addMark({ lineNumber: 30, label: '' });
    expect(firstFile.lineNumbers).to.eql([1, 10, 20, 30, 40, 50]);
  });

  it('after adding one new lineNumber, lineNumbers should return these numbers (ordered, no doubles)', () => {
    firstFile.mergeMarksAndLineNumbers([
      { lineNumber: 20, label: '' },
      { lineNumber: 30, label: '' },
      { lineNumber: 10, label: '' },
      { lineNumber: 20, label: '' },
      { lineNumber: 30, label: '' },
    ]);
    firstFile.mergeMarksAndLineNumbers([
      { lineNumber: 20, label: '' },
      { lineNumber: 50, label: '' },
      { lineNumber: 40, label: '' },
      { lineNumber: 50, label: '' },
    ]);
    firstFile.addMark({ lineNumber: 25, label: '' });
    expect(firstFile.lineNumbers).to.eql([1, 10, 20, 25, 30, 40, 50]);
  });

  describe('toggleTaskMark', () => {
    it('should add mark', () => {
      const lineNumber = 20;
      const label = 'test 20';
      const firstFile5 = new File(filePath, lineNumber, label);

      const persistMark = { lineNumber: 10, label: 'test 10' };
      firstFile5.toggleTaskMark(persistMark);

      expect(firstFile5.hasMark(lineNumber)).to.be.true;

      const mark = firstFile5.marks[0];
      expect(mark.lineNumber).to.equal(10);
      expect(mark.label).to.equal('test 10');
    });

    it('should remove mark if exists', () => {
      const lineNumber = 10;
      const label = 'test';
      const persistMark = { lineNumber, label };

      const firstFile6 = new File(filePath, lineNumber, label);
      //   firstFile6.addMark(persistMark);

      firstFile6.toggleTaskMark(persistMark);

      expect(firstFile6.hasMark(lineNumber)).to.be.false;
      expect(firstFile6.marks.length).to.equal(0);
    });
  });

  describe('hasMarks', () => {
    it('should return false if there are no marks', () => {
      const firstFile2 = new File(filePath);
      expect(firstFile2.hasMarks).to.be.false;
    });

    it('should return true if there are marks', () => {
      const lineNumber = 10;
      const label = 'test';
      const persistMark = { lineNumber, label };

      const firstFile3 = new File(filePath, lineNumber, label);
      firstFile3.addMark(persistMark);

      expect(firstFile3.hasMarks).to.be.true;
    });
  });
});
