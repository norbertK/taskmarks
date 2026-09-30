import * as path from 'path';
import * as fs from 'fs';
import Mocha from 'mocha';
import { glob } from 'glob';

// Check if we should collect coverage
const COVERAGE_ENABLED = process.env.COVERAGE === 'true';

export async function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
	});

	const testsRoot = path.resolve(__dirname, '..');
	const files = await glob('**/**.test.js', { cwd: testsRoot });

	// Add files to the test suite
	files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

	try {
		return new Promise<void>((c, e) => {
			// Run the mocha test
			mocha.run((failures: number) => {
				// Write coverage data if enabled
				if (COVERAGE_ENABLED && (global as any).__coverage__) {
					const coverageDir = path.resolve(__dirname, '../../../.nyc_output');
					if (!fs.existsSync(coverageDir)) {
						fs.mkdirSync(coverageDir, { recursive: true });
					}
					const coverageFile = path.join(coverageDir, 'vscode-coverage.json');
					fs.writeFileSync(coverageFile, JSON.stringify((global as any).__coverage__));
					console.log(`Coverage data written to ${coverageFile}`);
				}

				if (failures > 0) {
					e(new Error(`${failures} tests failed.`));
				} else {
					c();
				}
			});
		});
	} catch (err) {
		console.error(err);
	}
}
