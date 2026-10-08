import * as vscode from 'vscode';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { readFileSync } from 'fs';
import { join } from 'path';
import { activate } from '../../extension';
import { Commands } from '../../Commands';
import { Helper } from '../../Helper';

describe('extension', () => {
	const commandNames = [
		'selectMarkFromList',
		'selectTask',
		'renameTask',
		'createTask',
		'deleteTask',
		'toggleMark',
		'editLabel',
		'toggleMarkAtLine',
		'editLabelAtLine',
		'copyToClipboard',
		'pasteFromClipboard',
		'nextMark',
		'previousMark',
	] as const;

	let handlers: Record<string, () => unknown>;
	let subscriptions: unknown[];
	let context: vscode.ExtensionContext;
	let init: sinon.SinonStub;
	const outputChannel = {};

	beforeEach(() => {
		handlers = {};
		subscriptions = [];
		context = { subscriptions } as unknown as vscode.ExtensionContext;
		init = sinon.stub(Helper, 'init');
		sinon.replace(vscode.window, 'createOutputChannel', sinon.fake.returns(outputChannel) as any);
		sinon.replace(
			vscode.commands,
			'registerCommand',
			sinon.fake((id: string, handler: () => unknown) => {
				handlers[id] = handler;
				return { dispose: sinon.fake() };
			}) as any
		);
	});

	afterEach(() => {
		sinon.restore();
	});

	it('should initialize with the output channel for errors', () => {
		activate(context);
		expect(init.calledOnceWithExactly(context, outputChannel)).to.be.true;
	});

	it('should register exactly the commands that package.json declares', () => {
		// out/test/suite -> the folder of the extension
		const packageJson = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', 'package.json')).toString());
		const declared: string[] = packageJson.contributes.commands.map((command: { command: string }) => command.command);

		activate(context);

		expect(Object.keys(handlers).sort()).to.deep.equal([...declared].sort());
		expect(subscriptions.length).to.equal(declared.length);
	});

	commandNames.forEach((name) => {
		it(`should run Commands.${name} for taskmarks.${name}`, () => {
			const stubs = commandNames.map((commandName) => sinon.stub(Commands, commandName));
			activate(context);

			handlers[`taskmarks.${name}`]();

			stubs.forEach((stub, index) => {
				expect(stub.called, commandNames[index]).to.equal(commandNames[index] === name);
			});
		});
	});

	describe('menu of the line numbers', () => {
		const packageJson = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', 'package.json')).toString());
		const menuCommands = ['taskmarks.toggleMarkAtLine', 'taskmarks.editLabelAtLine'];

		it('should hand the clicked line to the two commands of the menu', () => {
			const toggleMarkAtLine = sinon.stub(Commands, 'toggleMarkAtLine');
			const editLabelAtLine = sinon.stub(Commands, 'editLabelAtLine');
			const target = { lineNumber: 5, uri: {} as vscode.Uri };
			activate(context);

			(handlers['taskmarks.toggleMarkAtLine'] as (target: unknown) => unknown)(target);
			(handlers['taskmarks.editLabelAtLine'] as (target: unknown) => unknown)(target);

			expect(toggleMarkAtLine.calledOnceWithExactly(target)).to.be.true;
			expect(editLabelAtLine.calledOnceWithExactly(target)).to.be.true;
		});

		it('should offer both commands in the menu, "Edit Bookmark Label" only on marked lines', () => {
			const menu: { command: string; when?: string }[] = packageJson.contributes.menus['editor/lineNumber/context'];
			expect(menu.map((entry) => entry.command)).to.deep.equal(menuCommands);
			expect(menu[0].when).to.be.undefined;
			// Helper.refresh sets taskmarks.markedLines
			expect(menu[1].when).to.equal('editorLineNumber in taskmarks.markedLines');
		});

		it('should keep the commands of the menu out of the command palette: they need a clicked line', () => {
			const palette: { command: string; when: string }[] = packageJson.contributes.menus.commandPalette;
			expect(palette).to.deep.equal(menuCommands.map((command) => ({ command, when: 'false' })));
		});

		it('should ask for a VS Code that has this menu (1.78 or newer)', () => {
			const [, major, minor] = /^\^(\d+)\.(\d+)\./.exec(packageJson.engines.vscode) ?? [];
			expect(Number(major) > 1 || Number(minor) >= 78, packageJson.engines.vscode).to.be.true;
		});
	});
});
