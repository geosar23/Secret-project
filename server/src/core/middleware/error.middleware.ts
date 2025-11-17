import { Request, Response, NextFunction } from "express";

export default function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  console.error("💥 Error:", err);
  res.status(err.statusCode || 500).json({
    message: err.message || "Unexpected error"
  });
}
