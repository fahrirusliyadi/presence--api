import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Middleware for validating request data against a Zod schema
 * @param schema The Zod schema to validate against
 * @param source Where to find the data to validate (body, query, params)
 */
export const validate = (
  schema: ZodSchema,
  source: "body" | "query" | "params" = "body",
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      console.log(
        "Validating data:",
        data,
        source,
        req.body,
        req.query,
        req.params,
      );
      const validatedData = await schema.parseAsync(data);

      // Replace the request data with the validated data
      req[source] = validatedData;

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        console.log(error);
        const formattedErrors = error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        }));

        return res.status(400).json({
          status: "error",
          message: formattedErrors[0].message,
          errors: formattedErrors,
        });
      }

      return res.status(500).json({
        status: "error",
        message: "Internal server error during validation",
      });
    }
  };
};
