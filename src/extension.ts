'use strict';

import * as vscode from 'vscode';

import { Persist } from './Persist';
import { Helper } from './Helper';
// import { DebLog } from './DebLog';

export function activate(context: vscode.ExtensionContext) {
  // const blackList: Array<string> = [];
  // // blackList.push('extension.ts');
  // // blackList.push('File');
  // // blackList.push('Mark');
  // // blackList.push('Persist');
  // // blackList.push('Task');
  // // blackList.push('Tasks');
  // // blackList.push('Helper');

  // DebLog.initLogfile('C:\\_work\\log\\debLog.txt', false, blackList);

  Helper.init(context);

  let selectMarkFromListDisposable = vscode.commands.registerCommand('taskmark.selectMarkFromList', () => {
    Helper.selectMarkFromList();
  });
  context.subscriptions.push(selectMarkFromListDisposable);

  let selectTaskDisposable = vscode.commands.registerCommand('taskmark.selectTask', () => {
    Helper.selectTask();
  });
  context.subscriptions.push(selectTaskDisposable);

  let createTaskDisposable = vscode.commands.registerCommand('taskmark.createTask', () => {
    Helper.createTask();
  });
  context.subscriptions.push(createTaskDisposable);

  let toggleMarkDisposable = vscode.commands.registerCommand('taskmark.toggleMark', () => {
    Helper.toggleMark();
  });
  context.subscriptions.push(toggleMarkDisposable);

  let copyToClipboardDisposable = vscode.commands.registerCommand('taskmark.copyToClipboard', () => {
    Persist.copyToClipboard();
    // Helper.dumpTasksToLog();
  });
  context.subscriptions.push(copyToClipboardDisposable);

  let pasteFromClipboardDisposable = vscode.commands.registerCommand('taskmark.pasteFromClipboard', () => {
    Persist.pasteFromClipboard();
    Helper.refresh();
  });
  context.subscriptions.push(pasteFromClipboardDisposable);

  let nextMarkDisposable = vscode.commands.registerCommand('taskmark.nextMark', () => {
    Helper.nextMark();
  });
  context.subscriptions.push(nextMarkDisposable);

  let previousMarkDisposable = vscode.commands.registerCommand('taskmark.previousMark', () => {
    Helper.previousMark();
  });
  context.subscriptions.push(previousMarkDisposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
