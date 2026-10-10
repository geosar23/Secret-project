import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { MulterError } from "multer";
import { config } from "../config/env";
import { AppError, ErrorCode, RuleViolationError } from "../utils/app-error.util";
import { sendError, softErrorRes } from "../utils/response.util";

const STATUS_TO_CODE: Record<number, ErrorCode> = {
    400: ErrorCode.BAD_REQUEST,
    401: ErrorCode.UNAUTHORIZED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    409: ErrorCode.CONFLICT,
    413: ErrorCode.PAYLOAD_TOO_LARGE,
    429: ErrorCode.TOO_MANY_REQUESTS,
};

/**
 * Maps any thrown value to an ErrorCode. Never exposes the original error message.
 * - AppError: its own code
 * - errors carrying a 4xx status (e.g. body-parser JSON/size errors): the matching code
 * - anything else: INTERNAL_ERROR
 */
const resolveErrorCode = (err: unknown): ErrorCode => {
    if (err instanceof AppError) {
        return err.code;
    }

    if (err instanceof MulterError) {
        return err.code === "LIMIT_FILE_SIZE" ? ErrorCode.PAYLOAD_TOO_LARGE : ErrorCode.BAD_REQUEST;
    }

    if (typeof err === "object" && err !== null) {
        const { status, statusCode } = err as { status?: unknown; statusCode?: unknown };
        const httpStatus = typeof statusCode === "number" ? statusCode : status;

        if (typeof httpStatus === "number" && httpStatus >= 400 && httpStatus < 500) {
            return STATUS_TO_CODE[httpStatus] ?? ErrorCode.BAD_REQUEST;
        }
    }

    return ErrorCode.INTERNAL_ERROR;
};

export const notFoundMiddleware = (_req: Request, res: Response): void => {
    sendError(res, ErrorCode.ROUTE_NOT_FOUND);
};

const errorMiddleware: ErrorRequestHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof RuleViolationError) {
        softErrorRes(res, err.publicMessage, { rule: err.rule });
        return;
    }

    const code = resolveErrorCode(err);

    // Always log server errors; log client errors only outside production.
    if (code === ErrorCode.INTERNAL_ERROR || config.NODE_ENV !== "production") {
        console.error(`Error on ${req.method} ${req.originalUrl}:`, err);
    }

    sendError(res, code);
};

export default errorMiddleware;
