/**
 * Message and stack of whatever was thrown - no VS Code dependencies.
 */

type ErrorWithMessage = {
	message: string;
	stack?: string | undefined;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
	return typeof error === 'object' && error !== null && 'message' in error && typeof (error as Record<string, unknown>).message === 'string';
}

function toErrorWithMessageAndStack(maybeError: unknown): ErrorWithMessage {
	if (isErrorWithMessage(maybeError)) {
		return maybeError;
	}

	try {
		return new Error(JSON.stringify(maybeError));
	} catch {
		// fallback in case there's an error stringifying the maybeError
		// like with circular references for example.
		return new Error(String(maybeError));
	}
}

export function getErrorMessage(error: unknown): string {
	return toErrorWithMessageAndStack(error).message;
}

export function getErrorStack(error: unknown): string | undefined {
	return toErrorWithMessageAndStack(error).stack;
}
