import { TaskManager } from '../../TaskManager';
import { Persist } from '../../Persist';
import { PathHelper } from '../../PathHelper';
import { Task } from '../../Task';
import { IPersistFile, IPersistTask, IPersistTaskManager } from '../../types';
import * as sinon from 'sinon';

import * as vscode from 'vscode';
import { expect } from 'chai';

const basePath = 'c:\\temp';
const markPath = '\\src\\Mark.ts';
const fullMarkPath = 'c:\\temp\\src\\Mark.ts';

// jest.mock('../PathHelper');

// const taskManager = TaskManager.instance;

// const { persistTasks, activeTaskName }: IPersistTaskManager =
//   JSON.parse(taskmarksJson);

// describe('Persist Tests', () => {
//   let mockFileExists = jest.fn();
//   let mockSaveTaskmarks = jest.fn();
//   let mockStaticMethod = jest.fn();
//   let mockCheckTaskmarksDataFilePath = jest.fn();

//   beforeEach(() => {
//     PathHelper.fileExists = mockFileExists;
//     PathHelper.saveTaskmarks = mockSaveTaskmarks;
//     PathHelper.checkTaskmarksDataFilePath = mockCheckTaskmarksDataFilePath;
//     PathHelper.getTaskmarksJson = mockStaticMethod;
//   });

//   test('initAndLoad', () => {
//     mockStaticMethod.mockReturnValue(taskmarksJson);

//     Persist.initAndLoad(taskManager);

//     expect(taskManager.activeTask.name).toEqual(activeTaskName);
//     expect(mockStaticMethod).toHaveBeenCalled();
//   });

//   it('saveTasks', () => {
//     mockFileExists.mockReturnValue(true);
//     Persist.saveTaskmarksJson();

//     const persistTaskManager: IPersistTaskManager = {
//       activeTaskName: taskManager.activeTask.name,
//       persistTasks: [],
//     };

//     taskManager.allTasks.forEach((task) => {
//       const persistTask: IPersistTask = copyTaskToPersistTask(task);
//       persistTaskManager.persistTasks.push(persistTask);
//     });

//     expect(mockSaveTaskmarks).toBeCalledWith(persistTaskManager);
//   });

//   // it('a longer path', () => {
//   //   expect(PathHelper.getFullPath(markPath)).toBe(fullMarkPath);
//   // });
// });

// function copyTaskToPersistTask(task: Task): IPersistTask {
//   const persistTask: IPersistTask = {
//     name: task.name,
//     persistFiles: [],
//   };

//   task.files.forEach((file) => {
//     if (file && file.marks && file.marks.length > 0) {
//       const persistFile: IPersistFile = {
//         filepath: file.filepath,
//         persistMarks: file.allPersistMarks,
//       };
//       persistTask.persistFiles.push(persistFile);
//     }
//   });
//   return persistTask;
// }

// suite('Persist Tests', () => {
// 	const taskManager = TaskManager.instance;

// 	const taskName = 'test task';
// 	const task = new Task(taskName);
// 	taskManager.addTask(Persist.copyTaskToPersistTask(task));

// 	test('initAndLoad should correctly load persisted tasks', () => {
// 		const oldTaskmarksJson = PathHelper.getTaskmarksJson();
// 		const persistTaskManager: IPersistTaskManager = {
// 			activeTaskName: taskName,
// 			persistTasks: [
// 				{
// 					name: 'persisted task',
// 					persistFiles: [
// 						{
// 							filepath: 'path/to/file',
// 							persistMarks: [
// 								{ lineNumber: 1, label: 'label1' },
// 								{ lineNumber: 2, label: 'label2' }
// 							]
// 						}
// 					]
// 				}
// 			]
// 		};
// 		// const persistTaskManagerJson = JSON.stringify(persistTaskManager);
// 		// export interface IPersistMark {
// 		// 	lineNumber: number;
// 		// 	label: string;
// 		//   }

// 		// const persistTaskManager: IPersistTaskManager = {
// 		// 	activeTaskName: this._taskManager.activeTask.name,
// 		// 	persistTasks: [],
// 		// };
// 		PathHelper.saveTaskmarks(persistTaskManager);

// 		Persist.initAndLoad(taskManager);

// 		expect(taskManager.allTasks.length).to.equal(2);
// 		const persistedTask = taskManager.allTasks[1];
// 		expect(persistedTask.name).to.equal('persisted task');
// 		expect(persistedTask.files.length).to.equal(1);
// 		const file = persistedTask.files[0];
// 		expect(file.filepath).to.equal('path/to/file');
// 		expect(file.lineNumbers.length).to.equal(2);
// 		// expect(file.getMarksForLine(1).length).to.equal(1);
// 		// expect(file.getMarksForLine(1)[0].name).to.equal('mark1');
// 		// expect(file.getMarksForLine(2).length).to.equal(1);
// 		// expect(file.getMarksForLine(2)[0].name).to.equal('mark2');

// 		// PathHelper.saveTaskmarks(oldTaskmarksJson);
// 	});

// 	test('saveTaskmarksJson should correctly save taskmarks', () => {
// 		Persist.initAndLoad(taskManager);

// 		Persist.copyTaskToPersistTask(task);
// 		Persist.saveTaskmarksJson();

// 		const taskmarksJson = PathHelper.getTaskmarksJson();
// 		const persistTaskManager = JSON.parse(taskmarksJson);
// 		expect(persistTaskManager.activeTaskName).to.equal(taskName);
// 		expect(persistTaskManager.persistTasks.length).to.equal(1);
// 		const persistTask = persistTaskManager.persistTasks[0];
// 		expect(persistTask.name).to.equal(taskName);
// 		expect(persistTask.persistFiles.length).to.equal(0);
// 	});

// 	test('copyToClipboard should correctly copy active task to clipboard', () => {
// 		const writeTextStub = sinon.stub(vscode.env.clipboard, 'writeText');
// 		Persist.copyToClipboard();
// 		expect(writeTextStub.calledOnce).to.be.true;
// 		const activeTaskString = writeTextStub.args[0][0];
// 		expect(activeTaskString).to.exist;
// 		const persistedTask = JSON.parse(activeTaskString);
// 		expect(persistedTask.name).to.equal(taskName);
// 		expect(persistedTask.persistFiles.length).to.equal(0);
// 		writeTextStub.restore();
// 	});
// });

// describe('Persist', () => {
//   let taskManager: TaskManager;

//   beforeEach(() => {
// 	const taskManager = TaskManager.instance;
//   });

//   describe('initAndLoad', () => {
//     it('should load taskmarks from JSON if file exists', () => {
//       const taskmarksJson = '{"activeTaskName": "testTask", "persistTasks": []}';
//       const readFileSyncStub = sinon.stub().returns(taskmarksJson);
//       const existsSyncStub = sinon.stub().returns(true);
//       const initTaskmarksDataFilePathStub = sinon.stub();
//       const replaceAllStub = sinon.stub().returns(taskmarksJson);
//       const pathHelperMock = {
//         initTaskmarksDataFilePath: initTaskmarksDataFilePathStub,
//         replaceAll: replaceAllStub,
//       };
//       const persistTask = { name: 'testTask', persistFiles: [] };
//       const persistTaskManager = {
//         activeTaskName: 'testTask',
//         persistTasks: [persistTask],
//       };
//       const expectedTaskManager = TaskManager.instance;

//       expectedTaskManager.addTask(persistTask);

//       const persist :  Persist={};
//       const getTaskmarksJsonStub = sinon.stub(persist, 'getTaskmarksJson')
//         .returns(taskmarksJson);
//       const pathHelperReplaceAllStub = sinon.stub(Persist, 'PathHelper').get(() => pathHelperMock);
//       const readFileSyncOrig = Persist.readFileSync;
//       const existsSyncOrig = Persist.existsSync;
//       Persist.readFileSync = readFileSyncStub;
//       Persist.existsSync = existsSyncStub;

//       Persist.initAndLoad(taskManager);

//       expect(getTaskmarksJsonStub.calledOnce).to.be.true;
//       expect(initTaskmarksDataFilePathStub.calledOnce).to.be.true;
//       expect(replaceAllStub.calledThrice).to.be.true;
//       expect(readFileSyncStub.calledOnceWithExactly(Persist.PathHelper._taskmarksDataFilePath)).to.be.true;
//       expect(existsSyncStub.calledOnceWithExactly(Persist.PathHelper._taskmarksDataFilePath)).to.be.true;
//       expect(taskManager.tasks).to.eql(expectedTaskManager.tasks);

//       Persist.readFileSync = readFileSyncOrig;
//       Persist.existsSync = existsSyncOrig;
//       pathHelperReplaceAllStub.restore();
//     });
//   });
// });
