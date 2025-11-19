import { Request, Response } from "express";

type ErrorWithStatus = { statusCode?: number; message?: string };

export default function errorMiddleware(
    err: ErrorWithStatus | unknown,
    req: Request,
    res: Response,
) {
    if (process.env.NODE_ENV !== "production") {
        console.error("💥 Error:", err);
    }
    let status = 500;
    let message = "Unexpected error";
    if (typeof err === "object" && err !== null) {
        if ("statusCode" in err && typeof (err as ErrorWithStatus).statusCode === "number") {
            status = (err as ErrorWithStatus).statusCode!;
        }
        if ("message" in err && typeof (err as ErrorWithStatus).message === "string") {
            message = (err as ErrorWithStatus).message!;
        }
    }
    res.status(status).json({ message });
}
