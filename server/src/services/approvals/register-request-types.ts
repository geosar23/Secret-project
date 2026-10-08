import { leaveRequestType } from "../leaves/leave.request-type";
import { registerRequestType } from "./request-type.registry";

/** Registers the behaviour of every system request type. Imported once by app.ts; idempotent. */
export function registerSystemRequestTypes(): void {
    registerRequestType(leaveRequestType);
}

registerSystemRequestTypes();
