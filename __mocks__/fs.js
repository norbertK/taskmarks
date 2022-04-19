/* eslint-disable @typescript-eslint/naming-convention */
'use strict';

const path = require('path');

const fs = jest.createMockFromModule('fs');

// // This is a custom function that our tests can use during setup to specify
// // what the files on the "mock" filesystem should look like when any of the
// // `fs` APIs are used.
let mockTaskmarksJson = '';
function __setMockJson(json) {
  mockTaskmarksJson = json;
  // for (const file in newMockFiles) {
  //   const dir = path.dirname(file);

  //   if (!mockTaskmarksJson[dir]) {
  //     mockTaskmarksJson[dir] = [];
  //   }
  //   mockTaskmarksJson[dir].push(path.basename(file));
  // }
}

// // A custom version of `readdirSync` that reads from the special mocked out
// // file list set via __setMockFiles
// function readdirSync(directoryPath) {
//   return mockTaskmarksJson[directoryPath] || [];
// }

function existsSync(path) {
  return true;
}
// function readFileSync(path) {
//   return mockTaskmarksJson;
// }

fs.__setMockJson = __setMockJson;
// fs.readdirSync = readdirSync;
fs.existsSync = existsSync;
// fs.readFileSync = readFileSync;

module.exports = fs;
