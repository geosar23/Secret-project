/**
 * Stable, machine-readable error codes. Clients should branch on `code`, never on message text.
 * Messages are fixed per code and never contain internal details.
 */
export const ErrorCode = {
    BAD_REQUEST: "BAD_REQUEST",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    NOT_FOUND: "NOT_FOUND",
    ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
    CONFLICT: "CONFLICT",
    PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
    TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
    INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ERROR_DEFINITIONS: Record<ErrorCode, { status: number; message: string }> = {
    BAD_REQUEST: { status: 400, message: "Bad Request" },
    UNAUTHORIZED: { status: 401, message: "Unauthorized" },
    FORBIDDEN: { status: 403, message: "Forbidden" },
    NOT_FOUND: { status: 404, message: "Not Found" },
    ROUTE_NOT_FOUND: { status: 404, message: "Route Not Found" },
    CONFLICT: { status: 409, message: "Conflict" },
    PAYLOAD_TOO_LARGE: { status: 413, message: "Payload Too Large" },
    TOO_MANY_REQUESTS: { status: 429, message: "Too Many Requests" },
    INTERNAL_ERROR: { status: 500, message: "Internal Server Error" },
};

/**
 * Typed operational error. Throw it from services/controllers; the central error middleware
 * maps it to the response. `internalMessage` is only logged, it is never sent to the client.
 */
export class AppError extends Error {
    readonly code: ErrorCode;
    readonly statusCode: number;

    constructor(code: ErrorCode, internalMessage?: string) {
        super(internalMessage ?? ERROR_DEFINITIONS[code].message);
        this.name = new.target.name;
        this.code = code;
        this.statusCode = ERROR_DEFINITIONS[code].status;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class BadRequestError extends AppError {
    constructor(internalMessage?: string) {
        super(ErrorCode.BAD_REQUEST, internalMessage);
    }
}

/**
 * A business rule the user can act on (overlapping leave, insufficient balance...). Unlike other AppErrors its
 * message is meant for the user: the error middleware answers with a soft error carrying `publicMessage` and `rule`.
 */
export class RuleViolationError extends BadRequestError {
    constructor(
        readonly rule: string,
        readonly publicMessage: string,
    ) {
        super(`${rule}: ${publicMessage}`);
    }
}

export class UnauthorizedError extends AppError {
    constructor(internalMessage?: string) {
        super(ErrorCode.UNAUTHORIZED, internalMessage);
    }
}

export class ForbiddenError extends AppError {
    constructor(internalMessage?: string) {
        super(ErrorCode.FORBIDDEN, internalMessage);
    }
}

export class NotFoundError extends AppError {
    constructor(internalMessage?: string) {
        super(ErrorCode.NOT_FOUND, internalMessage);
    }
}

export class ConflictError extends AppError {
    constructor(internalMessage?: string) {
        super(ErrorCode.CONFLICT, internalMessage);
    }
}
