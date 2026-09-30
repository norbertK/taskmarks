import { describe, it } from 'mocha';
import { expect } from 'chai';
import {
	taskToPersistTask,
	persistTaskToTask,
	serializeTaskManager,
	normalizeFilePaths,
	createDefaultTaskmarksJson,
} from '../../core/serialization';

describe('Serialization (pure)', () => {
	describe('taskToPersistTask', () => {
		it('should convert a task to persist format', () => {
			const task = {
				name: 'my-task',
				files: [
					{
						filepath: '/src/file.ts',
						marks: [
							{ lineNumber: 20, label: 'second' },
							{ lineNumber: 10, label: 'first' },
						],
					},
				],
			};

			const result = taskToPersistTask(task);

			expect(result.name).to.equal('my-task');
			expect(result.persistFiles.length).to.equal(1);
			expect(result.persistFiles[0].persistMarks[0].lineNumber).to.equal(10);
			expect(result.persistFiles[0].persistMarks[1].lineNumber).to.equal(20);
		});

		it('should sort marks by line number', () => {
			const task = {
				name: 'task',
				files: [
					{
						filepath: '/file.ts',
						marks: [
							{ lineNumber: 30, label: '' },
							{ lineNumber: 10, label: '' },
							{ lineNumber: 20, label: '' },
						],
					},
				],
			};

			const result = taskToPersistTask(task);
			const lineNumbers = result.persistFiles[0].persistMarks.map((m) => m.lineNumber);

			expect(lineNumbers).to.deep.equal([10, 20, 30]);
		});

		it('should skip files with no marks', () => {
			const task = {
				name: 'task',
				files: [
					{ filepath: '/empty.ts', marks: [] },
					{ filepath: '/has-marks.ts', marks: [{ lineNumber: 10, label: '' }] },
				],
			};

			const result = taskToPersistTask(task);

			expect(result.persistFiles.length).to.equal(1);
			expect(result.persistFiles[0].filepath).to.equal('/has-marks.ts');
		});

		it('should use fileExistsCheck callback', () => {
			const task = {
				name: 'task',
				files: [
					{ filepath: '/exists.ts', marks: [{ lineNumber: 10, label: '' }] },
					{ filepath: '/missing.ts', marks: [{ lineNumber: 20, label: '' }] },
				],
			};

			const result = taskToPersistTask(task, (path) => path === '/exists.ts');

			expect(result.persistFiles.length).to.equal(1);
			expect(result.persistFiles[0].filepath).to.equal('/exists.ts');
		});
	});

	describe('persistTaskToTask', () => {
		it('should convert persist format back to task', () => {
			const persistTask = {
				name: 'my-task',
				persistFiles: [
					{
						filepath: '/file.ts',
						persistMarks: [
							{ lineNumber: 10, label: 'mark1' },
							{ lineNumber: 20, label: 'mark2' },
						],
					},
				],
			};

			const result = persistTaskToTask(persistTask);

			expect(result.name).to.equal('my-task');
			expect(result.files.length).to.equal(1);
			expect(result.files[0].marks.length).to.equal(2);
		});
	});

	describe('serializeTaskManager', () => {
		it('should serialize to JSON string', () => {
			const tasks = [
				{
					name: 'task1',
					files: [{ filepath: '/file.ts', marks: [{ lineNumber: 10, label: '' }] }],
				},
			];

			const result = serializeTaskManager('task1', tasks);
			const parsed = JSON.parse(result);

			expect(parsed.version).to.equal(2);
			expect(parsed.activeTaskName).to.equal('task1');
			expect(parsed.persistTasks.length).to.equal(1);
		});

		it('should pretty-print with indentation', () => {
			const result = serializeTaskManager('default', []);
			expect(result).to.include('\n');
			expect(result).to.include('  ');
		});
	});

	describe('normalizeFilePaths', () => {
		it('should convert path separators', () => {
			const input = {
				activeTaskName: 'default',
				persistTasks: [
					{
						name: 'task',
						persistFiles: [{ filepath: '\\src\\file.ts', persistMarks: [] }],
					},
				],
			};

			const result = normalizeFilePaths(input, '\\', '/');

			expect(result.persistTasks[0].persistFiles[0].filepath).to.equal('/src/file.ts');
		});

		it('should not mutate the original', () => {
			const input = {
				activeTaskName: 'default',
				persistTasks: [
					{
						name: 'task',
						persistFiles: [{ filepath: '\\src\\file.ts', persistMarks: [] }],
					},
				],
			};

			normalizeFilePaths(input, '\\', '/');

			expect(input.persistTasks[0].persistFiles[0].filepath).to.equal('\\src\\file.ts');
		});
	});

	describe('createDefaultTaskmarksJson', () => {
		it('should create valid default JSON', () => {
			const result = createDefaultTaskmarksJson();
			const parsed = JSON.parse(result);

			expect(parsed.version).to.equal(2);
			expect(parsed.activeTaskName).to.equal('default');
			expect(parsed.persistTasks.length).to.equal(1);
			expect(parsed.persistTasks[0].name).to.equal('default');
		});

		it('should accept custom task name', () => {
			const result = createDefaultTaskmarksJson('custom');
			const parsed = JSON.parse(result);

			expect(parsed.activeTaskName).to.equal('custom');
			expect(parsed.persistTasks[0].name).to.equal('custom');
		});
	});
});
