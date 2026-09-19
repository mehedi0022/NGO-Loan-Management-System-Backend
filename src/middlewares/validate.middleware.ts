import type { Request, Response, NextFunction, RequestHandler } from "express";

import type { ZodType } from "zod";

import { ValidationError } from "../errors/AppError.js";

export const validate = (schema: ZodType): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(new ValidationError("Validation failed", errors));
    }

    const validatedData = result.data as {
      body?: unknown;
      params?: unknown;
      query?: unknown;
    };

    if (validatedData.body !== undefined) {
      req.body = validatedData.body;
    }

    if (validatedData.params !== undefined) {
      req.params = validatedData.params as Request["params"];
    }

    if (validatedData.query !== undefined) {
      // Express 5 exposes req.query through a getter, so direct assignment
      // throws. Install the validated allowlisted query for downstream code.
      Object.defineProperty(req, "query", {
        configurable: true,
        enumerable: true,
        value: validatedData.query as Request["query"],
        writable: false,
      });
    }

    next();
  };
};
