import fs = require('fs');
// import path = require('path');

//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
// import * as myExtension from '../extension';

// Defines a Mocha test suite to group tests of similar kind together
suite('Extension Tests', function() {
  var tests: string;

  // Defines a Mocha unit test
  test('Something 1', function() {
    assert.equal(-1, [1, 2, 3].indexOf(5));
    assert.equal(-1, [1, 2, 3].indexOf(0));

    assert.equal(tests, '123');
  });

  before(function(done) {
    fs.readFile('./taskmarks.test.txt', 'utf8', function(err, fileContents) {
      if (err) {
        throw err;
      }
      tests = fileContents; // JSON.parse(fileContents);
      done();
    });
  });
});
