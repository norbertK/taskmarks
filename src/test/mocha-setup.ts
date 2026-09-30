import Module from 'module';
import { vscode } from './mock/vscode.mock';

const originalRequire = Module.prototype.require;

Module.prototype.require = function (id: string) {
	if (id === 'vscode') {
		return vscode;
	}
	return originalRequire.apply(this, arguments as unknown as [string]);
};
