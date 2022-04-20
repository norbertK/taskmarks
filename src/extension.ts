import * as vscode from 'vscode';
import { Helper } from './Helper';
import { Persist } from './Persist';

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Taskmarks Errors');

  Helper.init(context, outputChannel);

  let selectMarkFromListDisposable = vscode.commands.registerCommand(
    'taskmarks.selectMarkFromList',
    () => {
      Helper.selectMarkFromList();
    }
  );
  context.subscriptions.push(selectMarkFromListDisposable);

  let selectTaskDisposable = vscode.commands.registerCommand(
    'taskmarks.selectTask',
    () => {
      Helper.selectTask();
    }
  );
  context.subscriptions.push(selectTaskDisposable);

  let renameTaskDisposable = vscode.commands.registerCommand(
    'taskmarks.renameTask',
    () => {
      Helper.renameTask();
    }
  );
  context.subscriptions.push(selectTaskDisposable);

  let createTaskDisposable = vscode.commands.registerCommand(
    'taskmarks.createTask',
    () => {
      Helper.createTask();
    }
  );
  context.subscriptions.push(createTaskDisposable);

  let deleteTaskDisposable = vscode.commands.registerCommand(
    'taskmarks.deleteTask',
    () => {
      Helper.deleteTask();
    }
  );
  context.subscriptions.push(deleteTaskDisposable);

  let toggleMarkDisposable = vscode.commands.registerCommand(
    'taskmarks.toggleMark',
    () => {
      Helper.toggleMark();
    }
  );
  context.subscriptions.push(toggleMarkDisposable);

  let copyToClipboardDisposable = vscode.commands.registerCommand(
    'taskmarks.copyToClipboard',
    () => {
      Persist.copyToClipboard();
    }
  );
  context.subscriptions.push(copyToClipboardDisposable);

  let pasteFromClipboardDisposable = vscode.commands.registerCommand(
    'taskmarks.pasteFromClipboard',
    () => {
      Persist.pasteFromClipboard();
      Helper.refresh();
    }
  );
  context.subscriptions.push(pasteFromClipboardDisposable);

  let nextMarkDisposable = vscode.commands.registerCommand(
    'taskmarks.nextMark',
    () => {
      Helper.nextMark();
    }
  );
  context.subscriptions.push(nextMarkDisposable);

  let previousMarkDisposable = vscode.commands.registerCommand(
    'taskmarks.previousMark',
    () => {
      Helper.previousMark();
    }
  );
  context.subscriptions.push(previousMarkDisposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
