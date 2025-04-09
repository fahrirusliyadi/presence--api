import { Request, Response, NextFunction } from "express";

/**
 * Wraps async functions to automatically catch errors and forward them to Express error handler
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - Express middleware function
 */
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
