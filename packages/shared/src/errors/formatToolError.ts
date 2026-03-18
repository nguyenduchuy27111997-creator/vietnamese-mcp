import { McpApiError } from './McpApiError.js';
import { translateErrorCode } from './error-codes.js';

export function formatToolError(err: unknown): {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
} {
  let text: string;
  if (err instanceof McpApiError) {
    // Attempt to translate the error code for additional context
    const translation = translateErrorCode(err.provider, err.error_code);
    text = JSON.stringify({
      error_code: err.error_code,
      message: err.message,
      provider: err.provider,
      suggestion: err.suggestion,
      ...(translation ? { code_meaning: translation } : {}),
    });
  } else if (err instanceof Error) {
    text = `Error: ${err.message}`;
  } else {
    text = `Error: ${String(err)}`;
  }
  console.error('[tool-error]', err);
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text }],
  };
}
