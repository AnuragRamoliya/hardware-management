export class AppError extends Error {
  public readonly status: number;

  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.status = statusCode;
  }
}
