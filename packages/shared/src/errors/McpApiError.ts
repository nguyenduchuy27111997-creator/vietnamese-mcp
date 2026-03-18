export class McpApiError extends Error {
  constructor(
    public readonly error_code: string,
    message: string,
    public readonly provider: string,
    public readonly suggestion?: string,
  ) {
    super(message);
    this.name = 'McpApiError';
  }
}
