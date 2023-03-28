// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Helper } from './Helper';
import { Persist } from './Persist';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Taskmarks Errors');
  Helper.init(context, outputChannel);

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  // console.log('Congratulations, your extension "taskmarks" is now active!');

  // The command has been defined in the package.json file in commands:
  //
  //   {
  // 	"command": "taskmarks.helloWorld",
  // 	"title": "Hello World"
  // },
  //
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  //   let disposable = vscode.commands.registerCommand(
  //     'taskmarks.helloWorld',
  //     () => {
  //       // The code you place here will be executed every time your command is executed
  //       // Display a message box to the user
  //       vscode.window.showInformationMessage('Hello World from taskmarks!');
  //     }
  //   );
  //   context.subscriptions.push(disposable);

  // const disposable = vscode.workspace.onDidSaveTextDocument((evt) => {
  // 	vscode.window.showInformationMessage(`Saved ${evt.fileName}`);
  // });
  // context.subscriptions.push(disposable);
  //   const disposable01 = vscode.window.setStatusBarMessage(
  //     'Never saved anything'
  //   );
  //   context.subscriptions.push(disposable01);

  //   const disposable02 = vscode.workspace.onDidSaveTextDocument((evt) => {
  //     const disposable = vscode.window.setStatusBarMessage(
  //       `Saved ${evt.fileName} at ${Date.now()}`
  //     );
  //     context.subscriptions.push(disposable);
  //   });
  //   context.subscriptions.push(disposable02);

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
  context.subscriptions.push(renameTaskDisposable);

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

// This method is called when your extension is deactivated
export function deactivate() {}
