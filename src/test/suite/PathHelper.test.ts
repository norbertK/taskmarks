import * as vscode from 'vscode';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PathHelper } from '../../PathHelper';

describe('PathHelper', () => {
	describe('basePath', () => {
		it('should get and set basePath', () => {
			PathHelper.basePath = '/test/path';
			expect(PathHelper.basePath).to.equal('/test/path');
		});
	});

	describe('getFullPath', () => {
		beforeEach(() => {
			PathHelper.basePath = 'c:\\temp';
		});

		it('should prepend basePath to filepath', () => {
			const fullPath = PathHelper.getFullPath('\\src\\file.ts');
			expect(fullPath).to.equal('c:\\temp\\src\\file.ts');
		});

		it('should handle empty filepath', () => {
			const fullPath = PathHelper.getFullPath('');
			expect(fullPath).to.equal('c:\\temp');
		});
	});

	describe('reducePath', () => {
		beforeEach(() => {
			PathHelper.basePath = 'c:\\workspace';
		});

		it('should remove basePath from filepath', () => {
			const reduced = PathHelper.reducePath('c:\\workspace\\src\\file.ts');
			expect(reduced).to.equal('\\src\\file.ts');
		});

		it('should return original path if basePath not present', () => {
			const reduced = PathHelper.reducePath('d:\\other\\path\\file.ts');
			expect(reduced).to.equal('d:\\other\\path\\file.ts');
		});

		it('should return the original path for a folder that only starts with the name of the workspace folder', () => {
			const reduced = PathHelper.reducePath('c:\\workspace2\\src\\file.ts');
			expect(reduced).to.equal('c:\\workspace2\\src\\file.ts');
		});
	});

	// these tests work on real files in a temporary folder
	describe('location of taskmarks.json', () => {
		let root: string;
		let workspaceFolder: string;
		let localFile: string;
		let workspaceStorage: string;
		let globalStorage: string;
		let context: vscode.ExtensionContext;
		let useGlobalTaskmarksJson: boolean;

		function resetLocation(): void {
			(PathHelper as any)._taskmarksDataFilePath = undefined;
			(PathHelper as any)._formerGlobalFilePath = undefined;
			(PathHelper as any)._taskmarksJsonIsNew = false;
		}

		function write(file: string, content: string): void {
			mkdirSync(join(file, '..'), { recursive: true });
			writeFileSync(file, content);
		}

		beforeEach(() => {
			root = mkdtempSync(join(tmpdir(), 'taskmarks-test-'));
			workspaceFolder = join(root, 'project');
			localFile = join(workspaceFolder, '.vscode', 'taskmarks.json');
			// VS Code doesn't create these folders, so the tests don't either
			workspaceStorage = join(root, 'workspaceStorage', 'abc', 'publisher.taskmarks');
			globalStorage = join(root, 'globalStorage', 'publisher.taskmarks');
			mkdirSync(workspaceFolder, { recursive: true });
			context = { storageUri: { fsPath: workspaceStorage }, globalStorageUri: { fsPath: globalStorage } } as unknown as vscode.ExtensionContext;

			useGlobalTaskmarksJson = false;
			sinon.stub(vscode.workspace, 'workspaceFolders').get(() => [{ uri: { fsPath: workspaceFolder } }]);
			sinon.replace(vscode.workspace, 'getConfiguration', sinon.fake.returns({ get: () => useGlobalTaskmarksJson }) as any);
			resetLocation();
		});

		afterEach(() => {
			sinon.restore();
			resetLocation();
			rmSync(root, { recursive: true, force: true });
		});

		it('should use .vscode/taskmarks.json in the workspace folder by default', () => {
			PathHelper.initTaskmarksDataFilePath(context);
			expect(PathHelper.taskmarksDataFilePath).to.equal(localFile);
		});

		it('should fail without a workspace folder', () => {
			sinon.restore();
			sinon.stub(vscode.workspace, 'workspaceFolders').get(() => undefined);
			expect(() => PathHelper.initTaskmarksDataFilePath(context)).to.throw();
		});

		it('should use the storage of this workspace with useGlobalTaskmarksJson', () => {
			useGlobalTaskmarksJson = true;
			PathHelper.initTaskmarksDataFilePath(context);
			expect(PathHelper.taskmarksDataFilePath).to.equal(join(workspaceStorage, 'taskmarks.json'));
		});

		it('should keep using an existing .vscode/taskmarks.json even with useGlobalTaskmarksJson', () => {
			useGlobalTaskmarksJson = true;
			write(localFile, '{}');
			PathHelper.initTaskmarksDataFilePath(context);
			expect(PathHelper.taskmarksDataFilePath).to.equal(localFile);
		});

		it('should use .vscode/taskmarks.json if VS Code has no storage for the workspace', () => {
			useGlobalTaskmarksJson = true;
			context = { storageUri: undefined, globalStorageUri: { fsPath: globalStorage } } as unknown as vscode.ExtensionContext;
			PathHelper.initTaskmarksDataFilePath(context);
			expect(PathHelper.taskmarksDataFilePath).to.equal(localFile);
		});

		it('should return the content of the file', () => {
			write(localFile, '{"activeTaskName":"mine"}');
			expect(PathHelper.getTaskmarksJson(context)).to.equal('{"activeTaskName":"mine"}');
			expect(PathHelper.taskmarksJsonIsNew).to.be.false;
		});

		it('should return an empty default task and not create a file if there is none', () => {
			const json = JSON.parse(PathHelper.getTaskmarksJson(context));
			expect(json.persistTasks).to.deep.equal([{ name: 'default', persistFiles: [] }]);
			expect(PathHelper.taskmarksJsonIsNew).to.be.true;
			expect(existsSync(localFile)).to.be.false;
		});

		it('should start with the former file for all workspaces and leave that file alone', () => {
			useGlobalTaskmarksJson = true;
			const formerFile = join(globalStorage, 'taskmarks.json');
			write(formerFile, '{"activeTaskName":"former"}');

			expect(PathHelper.getTaskmarksJson(context)).to.equal('{"activeTaskName":"former"}');
			expect(PathHelper.taskmarksJsonIsNew).to.be.true;

			PathHelper.checkTaskmarksDataFilePath();
			PathHelper.saveTaskmarks('{"activeTaskName":"this workspace"}');

			expect(readFileSync(join(workspaceStorage, 'taskmarks.json')).toString()).to.equal('{"activeTaskName":"this workspace"}');
			expect(readFileSync(formerFile).toString()).to.equal('{"activeTaskName":"former"}');
			expect(PathHelper.taskmarksJsonIsNew).to.be.false;
		});

		it('should prefer the file of this workspace over the former file for all workspaces', () => {
			useGlobalTaskmarksJson = true;
			write(join(globalStorage, 'taskmarks.json'), '{"activeTaskName":"former"}');
			write(join(workspaceStorage, 'taskmarks.json'), '{"activeTaskName":"this workspace"}');
			expect(PathHelper.getTaskmarksJson(context)).to.equal('{"activeTaskName":"this workspace"}');
		});

		it('should not read the former file for all workspaces without useGlobalTaskmarksJson', () => {
			write(join(globalStorage, 'taskmarks.json'), '{"activeTaskName":"former"}');
			const json = JSON.parse(PathHelper.getTaskmarksJson(context));
			expect(json.activeTaskName).to.equal('default');
		});

		it('should read the current content of the file, undefined if there is none', () => {
			PathHelper.initTaskmarksDataFilePath(context);
			expect(PathHelper.readTaskmarksJson()).to.be.undefined;

			write(localFile, '{"activeTaskName":"pulled"}');

			expect(PathHelper.readTaskmarksJson()).to.equal('{"activeTaskName":"pulled"}');
		});

		it('should no longer treat the file as new once someone else has created it', () => {
			PathHelper.getTaskmarksJson(context);
			expect(PathHelper.taskmarksJsonIsNew).to.be.true;

			write(localFile, '{}');
			PathHelper.readTaskmarksJson();

			expect(PathHelper.taskmarksJsonIsNew).to.be.false;
		});

		it('should create the folders for the file, also several levels', () => {
			useGlobalTaskmarksJson = true;
			PathHelper.initTaskmarksDataFilePath(context);
			PathHelper.checkTaskmarksDataFilePath();
			PathHelper.saveTaskmarks('{}');
			expect(existsSync(join(workspaceStorage, 'taskmarks.json'))).to.be.true;
		});

		it('should write a backup next to the file and never overwrite an existing one', () => {
			write(localFile, '{}');
			PathHelper.initTaskmarksDataFilePath(context);

			const backupPath = PathHelper.writeBackup('v1', 'first');
			PathHelper.writeBackup('v1', 'second');

			expect(backupPath).to.equal(localFile + '.v1.bak');
			expect(readFileSync(backupPath).toString()).to.equal('first');
		});
	});
});
