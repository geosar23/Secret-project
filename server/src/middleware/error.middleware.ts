import { Request, Response, NextFunction, ErrorRequestHandler } from "express";

type ErrorWithStatus = {
    statusCode?: number;
    message?: string;
};

const errorMiddleware: ErrorRequestHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        return next(err);
    }

    if (process.env.NODE_ENV !== "production") {
        console.error("💥 Error:", err);
    }

    let status = 500;
    let message = "Unexpected error";

    if (typeof err === "object" && err !== null) {
        const e = err as ErrorWithStatus;

        if (typeof e.statusCode === "number") {
            status = e.statusCode;
        }

        if (typeof e.message === "string") {
            message = e.message;
        }
    }

    res.status(status).json({ message });
};

export default errorMiddleware;
