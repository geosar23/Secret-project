import { Types } from "mongoose";

/**
 * Convert various reference representations to a string ID.
 *
 * Handles:
 * - strings (returned as-is)
 * - MongoDB ObjectId (converted to string)
 * - objects with _id property (recursively converts _id)
 * - objects with id property (returned if it's a string)
 *
 * @param value - A reference-like value to convert
 * @returns The string ID, or undefined if the value cannot be converted
 */
export function toIdString(value: unknown): string | undefined {
    if (!value) {
        return undefined;
    }

    if (typeof value === "string") {
        return value;
    }

    if (value instanceof Types.ObjectId) {
        return value.toString();
    }

    if (typeof value === "object") {
        const refValue = value as { _id?: unknown; id?: unknown };

        if ("_id" in value) {
            return toIdString(refValue._id);
        }

        if (typeof refValue.id === "string") {
            return refValue.id;
        }
    }

    return undefined;
}
