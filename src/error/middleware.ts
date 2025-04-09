import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { AppError } from "."; // Adjust import path if needed

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Log error for debugging
  console.error("Error:", err);

  // If headers already sent, delegate to Express's default error handler
  if (res.headersSent) {
    return next(err);
  }

  // Set content type to application/json
  res.setHeader("Content-Type", "application/json");

  // Default error status and message
  const statusCode = err instanceof AppError ? err.status : 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    status: "error",
    message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
