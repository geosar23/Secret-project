import { Response } from "express";
import { ERROR_DEFINITIONS, ErrorCode } from "./app-error.util";

export type SuccessResponse<T> = { success: true; data: T };
export type ErrorResponse = { success: false; message?: string; error?: unknown };
export type HardErrorResponse = { success: false; message: string; code: ErrorCode };

/**
 * Hard errors set an HTTP status and never expose a custom message or error detail.
 * The body carries a fixed message plus a stable machine-readable `code`.
 * Only softError (HTTP 200, success: false) may carry a custom message.
 */
export const sendError = (res: Response, code: ErrorCode): void => {
    const { status, message } = ERROR_DEFINITIONS[code];
    const body: HardErrorResponse = { success: false, message, code };
    res.status(status).json(body);
};

export const success = <T = unknown>(data: T): SuccessResponse<T> => ({ success: true, data });

export const softError = (message?: string, errorDetail?: unknown): ErrorResponse => ({
    success: false,
    message,
    error: errorDetail,
});

export const softErrorRes = (res: Response, message?: string, errorDetail?: unknown): void => {
    res.json(softError(message, errorDetail));
};

export const hardError = (res: Response): void => sendError(res, ErrorCode.INTERNAL_ERROR);
export const notFoundError = (res: Response): void => sendError(res, ErrorCode.NOT_FOUND);
export const badRequestError = (res: Response): void => sendError(res, ErrorCode.BAD_REQUEST);
export const unauthorizedError = (res: Response): void => sendError(res, ErrorCode.UNAUTHORIZED);
export const forbiddenError = (res: Response): void => sendError(res, ErrorCode.FORBIDDEN);
export const conflictError = (res: Response): void => sendError(res, ErrorCode.CONFLICT);
export const passwordChangeRequiredError = (res: Response): void => sendError(res, ErrorCode.PASSWORD_CHANGE_REQUIRED);
export const tooManyRequestsError = (res: Response): void => sendError(res, ErrorCode.TOO_MANY_REQUESTS);

export const responseUtil = {
    success,
    softError,
    hardError,
    notFoundError,
    badRequestError,
    unauthorizedError,
    forbiddenError,
    conflictError,
    tooManyRequestsError,
};
