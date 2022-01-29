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

  const selectMarkFromListDisposable = vscode.commands.registerCommand(
    'taskmark.selectMarkFromList',
    () => {
      Helper.selectMarkFromList();
    }
  );
  context.subscriptions.push(selectMarkFromListDisposable);

  const selectTaskDisposable = vscode.commands.registerCommand(
    'taskmark.selectTask',
    () => {
      Helper.selectTask();
    }
  );
  context.subscriptions.push(selectTaskDisposable);

  const createTaskDisposable = vscode.commands.registerCommand(
    'taskmark.createTask',
    () => {
      Helper.createTask();
    }
  );
  context.subscriptions.push(createTaskDisposable);

  // const renameTaskDisposable = vscode.commands.registerCommand('taskmark.renameTask', () => {
  //   Helper.renameTask();
  // });
  // context.subscriptions.push(renameTaskDisposable);

  const deleteTaskDisposable = vscode.commands.registerCommand(
    'taskmark.deleteTask',
    () => {
      Helper.deleteTask();
    }
  );
  context.subscriptions.push(deleteTaskDisposable);

  const toggleMarkDisposable = vscode.commands.registerCommand(
    'taskmark.toggleMark',
    () => {
      Helper.toggleMark();
    }
  );
  context.subscriptions.push(toggleMarkDisposable);

  const copyToClipboardDisposable = vscode.commands.registerCommand(
    'taskmark.copyToClipboard',
    () => {
      Persist.copyToClipboard();
      // Helper.dumpTasksToLog();
    }
  );
  context.subscriptions.push(copyToClipboardDisposable);

  const pasteFromClipboardDisposable = vscode.commands.registerCommand(
    'taskmark.pasteFromClipboard',
    () => {
      Persist.pasteFromClipboard();
      Helper.refresh();
    }
  );
  context.subscriptions.push(pasteFromClipboardDisposable);

  const nextMarkDisposable = vscode.commands.registerCommand(
    'taskmark.nextMark',
    () => {
      Helper.nextMark();
    }
  );
  context.subscriptions.push(nextMarkDisposable);

  const previousMarkDisposable = vscode.commands.registerCommand(
    'taskmark.previousMark',
    () => {
      Helper.previousMark();
    }
  );
  context.subscriptions.push(previousMarkDisposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
  return Promise.resolve();
}
