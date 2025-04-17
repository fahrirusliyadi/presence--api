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

  // Default error status and message
  const statusCode = err instanceof AppError ? err.status : 500;
  const message =
    isAxiosError(err) && err.response
      ? (err.response.data.message ?? err.message)
      : err.message;

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
