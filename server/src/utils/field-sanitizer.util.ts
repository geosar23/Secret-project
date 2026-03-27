export type FieldType = "string" | "boolean" | "number";

export interface FieldConfig<TTarget extends object> {
    type: FieldType;
    targetField: keyof TTarget;
    isPointer?: boolean;
    pointerClass?: string;
    required?: boolean;
    allowUnset?: boolean;
    isEmail?: boolean;
    minLength?: number;
    toBeHashed?: boolean;
}

export type FieldMap<TTarget extends object> = Record<string, FieldConfig<TTarget>>;

export function isValidObjectId(value: unknown): value is string {
    return typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value.trim());
}

export function setMappedFields<TTarget extends object>(
    target: Partial<TTarget>,
    fields: FieldMap<TTarget>,
    data: Record<string, unknown>,
): void {
    for (const [field, config] of Object.entries(fields)) {
        const raw = data[field];

        if (raw === undefined) {
            continue;
        }

        if ((raw === null || (typeof raw === "string" && raw.trim().length === 0)) && config.allowUnset) {
            (target as Record<string, unknown>)[config.targetField as string] = null;
            continue;
        }

        switch (config.type) {
            case "boolean": {
                if (typeof raw !== "boolean") {
                    console.log(`[setMappedFields] Skipping '${field}': expected boolean`);
                    continue;
                }

                (target as Record<string, unknown>)[config.targetField as string] = raw;
                continue;
            }

            case "number": {
                if (typeof raw !== "number") {
                    console.log(`[setMappedFields] Skipping '${field}': expected number`);
                    continue;
                }

                (target as Record<string, unknown>)[config.targetField as string] = raw;
                continue;
            }

            case "string": {
                if (typeof raw !== "string") {
                    console.log(`[setMappedFields] Skipping '${field}': expected string`);
                    continue;
                }

                const trimmed = raw.trim();

                if (trimmed.length === 0) {
                    if (config.required) {
                        throw new Error(`Field '${field}' is required and cannot be empty`);
                    }
                    continue;
                }

                if (config.minLength !== undefined && trimmed.length < config.minLength) {
                    console.log(
                        `[setMappedFields] Skipping '${field}': must be at least ${config.minLength} characters`,
                    );
                    continue;
                }

                if (config.isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                    console.log(`[setMappedFields] Skipping '${field}': invalid email format`);
                    continue;
                }

                if (config.toBeHashed) {
                    (target as Record<string, unknown>)[config.targetField as string] = `HASH:${trimmed}`;
                    continue;
                }

                if (config.isPointer && !isValidObjectId(trimmed)) {
                    const classHint = config.pointerClass ? ` (${config.pointerClass})` : "";
                    console.log(`[setMappedFields] Skipping '${field}': invalid pointer id${classHint}`);
                    continue;
                }

                (target as Record<string, unknown>)[config.targetField as string] = trimmed;
                continue;
            }
        }
    }
}
