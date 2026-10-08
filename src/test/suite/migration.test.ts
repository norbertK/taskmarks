import { describe, it } from 'mocha';
import { expect } from 'chai';
import { CURRENT_VERSION, VERSION_WITHOUT_BREAKPOINTS, detectVersion, loadTaskmarksJson, upgradeTask, versionToWrite } from '../../core/migration';

const v0Marks2018 = {
	activeTaskName: 'bugfix',
	tasks: [
		{ name: 'default', files: [] },
		{ name: 'bugfix', files: [{ filepath: '\\src\\Task.ts', marks: [3, 17] }] },
	],
};

const v0LineNumbers0817 = {
	activeTaskName: 'default',
	tasks: [{ name: 'default', files: [{ filepath: '\\src\\Mark.ts', lineNumbers: [5, 9] }] }],
};

const v0PersistTasks0821 = {
	activeTaskName: 'default',
	persistTasks: [{ name: 'default', persistFiles: [{ filepath: '\\src\\File.ts', lineNumbers: [1, 2] }] }],
};

const v1Labels = {
	activeTaskName: 'default',
	persistTasks: [
		{
			name: 'default',
			persistFiles: [{ filepath: '\\src\\Ring.ts', persistMarks: [{ lineNumber: 4, label: 'look here' }] }],
		},
	],
};

describe('migration', () => {
	describe('detectVersion', () => {
		it('treats the 2018 "tasks/files/marks" format as version 0', () => {
			expect(detectVersion(v0Marks2018)).to.equal(0);
		});

		it('treats the 0.8.17 "lineNumbers" format as version 0', () => {
			expect(detectVersion(v0LineNumbers0817)).to.equal(0);
		});

		it('treats the 0.8.21 "persistTasks" with "lineNumbers" format as version 0', () => {
			expect(detectVersion(v0PersistTasks0821)).to.equal(0);
		});

		it('treats "persistMarks" without a version field as version 1', () => {
			expect(detectVersion(v1Labels)).to.equal(1);
		});

		it('uses the version field when present', () => {
			expect(detectVersion({ ...v1Labels, version: 2 })).to.equal(2);
			expect(detectVersion({ ...v1Labels, version: 7 })).to.equal(7);
		});
	});

	describe('loadTaskmarksJson', () => {
		it('upgrades the 2018 format and keeps every mark and the active task', () => {
			const result = loadTaskmarksJson(JSON.stringify(v0Marks2018));

			expect(result.status).to.equal('ok');
			if (result.status !== 'ok') {
				return;
			}
			expect(result.fromVersion).to.equal(0);
			expect(result.data).to.eql({
				version: VERSION_WITHOUT_BREAKPOINTS,
				activeTaskName: 'bugfix',
				persistTasks: [
					{ name: 'default', persistFiles: [] },
					{
						name: 'bugfix',
						persistFiles: [
							{
								filepath: '\\src\\Task.ts',
								persistMarks: [
									{ lineNumber: 3, label: '' },
									{ lineNumber: 17, label: '' },
								],
							},
						],
					},
				],
			});
		});

		it('upgrades the 0.8.17 lineNumbers format', () => {
			const result = loadTaskmarksJson(JSON.stringify(v0LineNumbers0817));
			expect(result.status).to.equal('ok');
			if (result.status === 'ok') {
				expect(result.data.persistTasks[0].persistFiles[0].persistMarks.map((m) => m.lineNumber)).to.eql([5, 9]);
			}
		});

		it('upgrades the 0.8.21 persistTasks + lineNumbers format', () => {
			const result = loadTaskmarksJson(JSON.stringify(v0PersistTasks0821));
			expect(result.status).to.equal('ok');
			if (result.status === 'ok') {
				expect(result.data.persistTasks[0].persistFiles[0].persistMarks.map((m) => m.lineNumber)).to.eql([1, 2]);
			}
		});

		it('keeps labels from version 1 and adds the version', () => {
			const result = loadTaskmarksJson(JSON.stringify(v1Labels));
			expect(result.status).to.equal('ok');
			if (result.status === 'ok') {
				expect(result.fromVersion).to.equal(1);
				expect(result.data.version).to.equal(VERSION_WITHOUT_BREAKPOINTS);
				expect(result.data.persistTasks[0].persistFiles[0].persistMarks).to.eql([{ lineNumber: 4, label: 'look here' }]);
			}
		});

		it('loads a version 2 file unchanged: it stays version 2 as long as no breakpoints are shared', () => {
			const version2 = { version: 2, ...v1Labels };
			const result = loadTaskmarksJson(JSON.stringify(version2));
			expect(result.status).to.equal('ok');
			if (result.status === 'ok') {
				expect(result.fromVersion).to.equal(2);
				expect(result.data).to.eql(version2);
				expect(result.data.persistTasks[0]).to.not.have.property('persistBreakpoints');
			}
		});

		it('loads a current file with its shared breakpoints unchanged', () => {
			const current = {
				version: CURRENT_VERSION,
				activeTaskName: 'default',
				persistTasks: [
					{
						...v1Labels.persistTasks[0],
						persistBreakpoints: [
							{ filepath: '\\src\\Task.ts', lineNumber: 12 },
							{ filepath: '\\src\\Task.ts', lineNumber: 30, column: 8, enabled: false, condition: 'name === undefined', hitCondition: '3', logMessage: 'name: {name}' },
						],
					},
				],
			};
			const result = loadTaskmarksJson(JSON.stringify(current));
			expect(result.status).to.equal('ok');
			if (result.status === 'ok') {
				expect(result.fromVersion).to.equal(3);
				expect(result.data).to.eql(current);
			}
		});

		it('drops broken breakpoints but keeps the rest', () => {
			const messy = {
				version: 3,
				activeTaskName: 'default',
				persistTasks: [{ name: 'default', persistFiles: [], persistBreakpoints: [{ filepath: '\\a.ts', lineNumber: 1 }, { lineNumber: 2 }, { filepath: '\\a.ts', lineNumber: -1 }, 'x', null] }],
			};
			const result = loadTaskmarksJson(JSON.stringify(messy));
			expect(result.status).to.equal('ok');
			if (result.status === 'ok') {
				expect(result.data.persistTasks[0].persistBreakpoints).to.eql([{ filepath: '\\a.ts', lineNumber: 1 }]);
			}
		});

		it('reports a file from a newer version and still loads the known fields', () => {
			const newer = { ...v1Labels, version: CURRENT_VERSION + 1, breakpoints: [] };
			const result = loadTaskmarksJson(JSON.stringify(newer));
			expect(result.status).to.equal('newer');
			if (result.status === 'newer') {
				expect(result.fromVersion).to.equal(CURRENT_VERSION + 1);
				expect(result.data.persistTasks[0].persistFiles[0].persistMarks.length).to.equal(1);
			}
		});

		it('reports invalid JSON instead of throwing', () => {
			const result = loadTaskmarksJson('{ "activeTaskName": ');
			expect(result.status).to.equal('invalid');
		});

		it('reports a JSON value that is not an object', () => {
			expect(loadTaskmarksJson('[1, 2]').status).to.equal('invalid');
			expect(loadTaskmarksJson('null').status).to.equal('invalid');
		});

		it('creates a default task when the file has no tasks', () => {
			const result = loadTaskmarksJson('{}');
			expect(result.status).to.equal('ok');
			if (result.status === 'ok') {
				expect(result.data.activeTaskName).to.equal('default');
				expect(result.data.persistTasks).to.eql([{ name: 'default', persistFiles: [] }]);
			}
		});

		it('falls back to the first task when the active task does not exist', () => {
			const result = loadTaskmarksJson(JSON.stringify({ ...v1Labels, activeTaskName: 'gone' }));
			if (result.status === 'ok') {
				expect(result.data.activeTaskName).to.equal('default');
			}
		});

		it('drops broken entries but keeps the rest', () => {
			const messy = {
				activeTaskName: 'default',
				persistTasks: [
					{ name: 'default', persistFiles: [{ filepath: '\\a.ts', persistMarks: [{ lineNumber: 1 }, { lineNumber: -3 }, 'x', { lineNumber: 2.5 }] }, { persistMarks: [] }] },
					{ persistFiles: [] },
					null,
				],
			};
			const result = loadTaskmarksJson(JSON.stringify(messy));
			expect(result.status).to.equal('ok');
			if (result.status === 'ok') {
				expect(result.data.persistTasks.length).to.equal(1);
				expect(result.data.persistTasks[0].persistFiles).to.eql([{ filepath: '\\a.ts', persistMarks: [{ lineNumber: 1, label: '' }] }]);
			}
		});
	});

	describe('versionToWrite', () => {
		const task = v1Labels.persistTasks[0];

		it('is version 2 while no task shares breakpoints', () => {
			expect(versionToWrite([task, { ...task, persistBreakpoints: [] }])).to.equal(2);
			expect(versionToWrite([])).to.equal(2);
		});

		it('is version 3 as soon as a task shares breakpoints', () => {
			expect(versionToWrite([task, { ...task, persistBreakpoints: [{ filepath: '\\a.ts', lineNumber: 1 }] }])).to.equal(3);
		});
	});

	describe('upgradeTask', () => {
		it('keeps the shared breakpoints of a task copied to the clipboard', () => {
			expect(upgradeTask({ name: 't', persistFiles: [], persistBreakpoints: [{ filepath: '/x.ts', lineNumber: 2, condition: 'a' }] })).to.eql({
				name: 't',
				persistFiles: [],
				persistBreakpoints: [{ filepath: '/x.ts', lineNumber: 2, condition: 'a' }],
			});
		});

		it('accepts a task copied to the clipboard by the 2018 version', () => {
			expect(upgradeTask({ name: 't', files: [{ filepath: '\\x.ts', marks: [2] }] })).to.eql({
				name: 't',
				persistFiles: [{ filepath: '\\x.ts', persistMarks: [{ lineNumber: 2, label: '' }] }],
			});
		});

		it('rejects values that are not a task', () => {
			expect(upgradeTask('hello')).to.be.undefined;
			expect(upgradeTask({ persistFiles: [] })).to.be.undefined;
		});
	});

	describe('line numbers that can not be lines', () => {
		it('drops negative and fractional line numbers of an old file', () => {
			const result = loadTaskmarksJson(JSON.stringify({ activeTaskName: 'default', tasks: [{ name: 'default', files: [{ filepath: '\\a.ts', marks: [3, -1, 1.5] }] }] }));
			expect(result.status).to.equal('ok');
			expect((result as any).data.persistTasks[0].persistFiles[0].persistMarks).to.deep.equal([{ lineNumber: 3, label: '' }]);
		});

		it('drops negative and fractional line numbers of labelled marks', () => {
			const task = upgradeTask({
				name: 't',
				persistFiles: [
					{
						filepath: '\\a.ts',
						persistMarks: [
							{ lineNumber: 3, label: 'ok' },
							{ lineNumber: -1, label: 'negative' },
							{ lineNumber: 1.5, label: 'fraction' },
						],
					},
				],
			});
			expect(task?.persistFiles[0].persistMarks).to.deep.equal([{ lineNumber: 3, label: 'ok' }]);
		});
	});
});
