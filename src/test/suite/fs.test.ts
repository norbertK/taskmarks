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

// Note: fs stubbing tests removed - fs.readFile/writeFile are non-configurable
// in newer Node.js versions and cannot be stubbed with sinon.
// These were demo tests, not actual Taskmarks functionality tests.
