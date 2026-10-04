/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncHandler = (...args: any[]) => unknown;

/**
 * Wraps an async handler so rejected promises are forwarded to the central error middleware
 * (Express 4 does not do this on its own).
 */
export const asyncHandler =
    <T extends AsyncHandler>(handler: T): RequestHandler =>
    (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };

/**
 * Wraps every static handler of a controller class with `asyncHandler`.
 * Return type is preserved so route definitions keep their existing typings.
 */
export const wrapController = <T extends object>(controller: T): T => {
    const wrapped: Record<string, unknown> = {};

    for (const key of Object.getOwnPropertyNames(controller)) {
        const value = (controller as Record<string, unknown>)[key];
        if (typeof value === "function" && key !== "constructor" && key !== "prototype") {
            wrapped[key] = asyncHandler((value as AsyncHandler).bind(controller));
        }
    }

    return wrapped as T;
};
