import * as vscode from 'vscode';
import { Helper } from './Helper';
import { Commands } from './Commands';

export function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel('Taskmarks Errors');
	Helper.init(context, outputChannel);

	let selectMarkFromListDisposable = vscode.commands.registerCommand('taskmarks.selectMarkFromList', () => {
		Commands.selectMarkFromList();
	});
	context.subscriptions.push(selectMarkFromListDisposable);

	let selectTaskDisposable = vscode.commands.registerCommand('taskmarks.selectTask', () => {
		Commands.selectTask();
	});
	context.subscriptions.push(selectTaskDisposable);

	let renameTaskDisposable = vscode.commands.registerCommand('taskmarks.renameTask', () => {
		Commands.renameTask();
	});
	context.subscriptions.push(renameTaskDisposable);

	let createTaskDisposable = vscode.commands.registerCommand('taskmarks.createTask', () => {
		Commands.createTask();
	});
	context.subscriptions.push(createTaskDisposable);

	let deleteTaskDisposable = vscode.commands.registerCommand('taskmarks.deleteTask', () => {
		Commands.deleteTask();
	});
	context.subscriptions.push(deleteTaskDisposable);

	let toggleMarkDisposable = vscode.commands.registerCommand(
		'taskmarks.toggleMark',

		() => {
			Commands.toggleMark();
		}
	);
	context.subscriptions.push(toggleMarkDisposable);

	let copyToClipboardDisposable = vscode.commands.registerCommand('taskmarks.copyToClipboard', () => {
		Commands.copyToClipboard();
	});
	context.subscriptions.push(copyToClipboardDisposable);

	let pasteFromClipboardDisposable = vscode.commands.registerCommand('taskmarks.pasteFromClipboard', () => {
		Commands.pasteFromClipboard();
	});
	context.subscriptions.push(pasteFromClipboardDisposable);

	let nextMarkDisposable = vscode.commands.registerCommand('taskmarks.nextMark', () => {
		Commands.nextMark();
	});
	context.subscriptions.push(nextMarkDisposable);

	let previousMarkDisposable = vscode.commands.registerCommand('taskmarks.previousMark', () => {
		Commands.previousMark();
	});
	context.subscriptions.push(previousMarkDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
