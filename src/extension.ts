'use strict';

import * as vscode from 'vscode';

import { Persist } from './Persist';
import { Helper } from './Helper';

export function activate(context: vscode.ExtensionContext) {
  Helper.init(context);

  let selectMarkFromListDisposable = vscode.commands.registerCommand(
    'taskmark.selectMarkFromList',
    () => {
      Helper.selectMarkFromList();
    }
  );
  context.subscriptions.push(selectMarkFromListDisposable);

  let selectTaskDisposable = vscode.commands.registerCommand(
    'taskmark.selectTask',
    () => {
      Helper.selectTask();
    }
  );
  context.subscriptions.push(selectTaskDisposable);

  let createTaskDisposable = vscode.commands.registerCommand(
    'taskmark.createTask',
    () => {
      Helper.createTask();
    }
  );
  context.subscriptions.push(createTaskDisposable);

  let deleteTaskDisposable = vscode.commands.registerCommand(
    'taskmark.deleteTask',
    () => {
      Helper.deleteTask();
    }
  );
  context.subscriptions.push(deleteTaskDisposable);

  let toggleMarkDisposable = vscode.commands.registerCommand(
    'taskmark.toggleMark',
    () => {
      Helper.toggleMark();
    }
  );
  context.subscriptions.push(toggleMarkDisposable);

  let copyToClipboardDisposable = vscode.commands.registerCommand(
    'taskmark.copyToClipboard',
    () => {
      Persist.copyToClipboard();
    }
  );
  context.subscriptions.push(copyToClipboardDisposable);

  let pasteFromClipboardDisposable = vscode.commands.registerCommand(
    'taskmark.pasteFromClipboard',
    () => {
      Persist.pasteFromClipboard();
      Helper.refresh();
    }
  );
  context.subscriptions.push(pasteFromClipboardDisposable);

  let nextMarkDisposable = vscode.commands.registerCommand(
    'taskmark.nextMark',
    () => {
      Helper.nextMark();
    }
  );
  context.subscriptions.push(nextMarkDisposable);

  let previousMarkDisposable = vscode.commands.registerCommand(
    'taskmark.previousMark',
    () => {
      Helper.previousMark();
    }
  );
  context.subscriptions.push(previousMarkDisposable);
}

// this method is called when your extension is deactivated
export async function deactivate() {
  return;
}
