import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '.'; // Adjust import path if needed
import { isAxiosError } from 'axios';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Log error for debugging
  console.error('Error:', err);

  // If headers already sent, delegate to Express's default error handler
  if (res.headersSent) {
    return next(err);
  }

  // Set content type to application/json
  res.setHeader('Content-Type', 'application/json');

  let statusCode: number;
  let message: string;
  let errorType: string;

  // Handle different error types with combined logic
  if (isAxiosError(err)) {
    // Axios errors - extract status, message and type from response
    statusCode = err.response?.status ?? 500;
    message = err.response?.data?.message ?? err.message;
    errorType = err.response?.data?.type ?? 'AxiosError';
  } else if (err instanceof AppError) {
    // Custom application errors
    statusCode = err.status;
    message = err.message;
    errorType = err.type;
  } else {
    // Other errors
    statusCode = 500;
    message = err.message;
    errorType = err.constructor.name ?? 'Error';
  }

  res.status(statusCode).json({
    message,
    type: errorType,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
