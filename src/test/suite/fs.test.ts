import * as fs from 'fs';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'mocha';

// Define the type for the mocked fs module
interface MockedFS {
  readFile: sinon.SinonStub;
  writeFile: sinon.SinonStub;
}

const myFunctionThatReadsFile = (filePath: string) => {
  fs.readFile(filePath, 'utf8', (error, data) => {
    console.log(error, data);
  });
};

const myFunctionThatWritesToFile = (filePath: string, data: string) => {
  fs.writeFile(filePath, data, 'utf8', (err) => {
    if (err) {
      throw err;
    }
    console.log('The file has been saved!');
  });
};

describe('My Test Suite', () => {
  let mockedFs: MockedFS;

  beforeEach(() => {
    mockedFs = {
      readFile: sinon.stub(fs, 'readFile'),
      writeFile: sinon.stub(fs, 'writeFile'),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should mock fs.readFile', () => {
    // Set up the behavior of the mocked fs.readFile
    mockedFs.readFile
      .withArgs('path/to/file', 'utf8')
      .yields(null, 'File content');

    // Call the function that reads the file
    myFunctionThatReadsFile('path/to/file');

    // Verify that the function was called with the expected arguments
    expect(mockedFs.readFile.calledOnce).to.be.true;
    expect(mockedFs.readFile.firstCall.args[0]).to.equal('path/to/file');
    expect(mockedFs.readFile.firstCall.args[1]).to.equal('utf8');
  });

  it('should mock fs.writeFile', () => {
    // Set up the behavior of the mocked fs.writeFile
    mockedFs.writeFile
      .withArgs('path/to/file', 'File content', 'utf8')
      .yields(null);

    // Call the function that writes to the file
    myFunctionThatWritesToFile('path/to/file', 'File content');

    // Verify that the function was called with the expected arguments
    expect(mockedFs.writeFile.calledOnce).to.be.true;
    expect(mockedFs.writeFile.firstCall.args[0]).to.equal('path/to/file');
    expect(mockedFs.writeFile.firstCall.args[1]).to.equal('File content');
    expect(mockedFs.writeFile.firstCall.args[2]).to.equal('utf8');
  });
});
