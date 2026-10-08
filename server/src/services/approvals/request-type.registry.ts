import { RequestTypeDefinition } from "../../interfaces/request-type.interface";
import { BadRequestError } from "../../utils/app-error.util";

const registry = new Map<string, RequestTypeDefinition<any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any

export function registerRequestType<T>(definition: RequestTypeDefinition<T>): void {
    registry.set(definition.type, definition);
}

export function getRequestType(type: string): RequestTypeDefinition<unknown> {
    const definition = registry.get(type);
    if (!definition) {
        throw new BadRequestError(`Unknown request type "${type}"`);
    }
    return definition;
}

export function listRequestTypes(): RequestTypeDefinition<unknown>[] {
    return [...registry.values()];
}

/** Test helper: removes every registered type. */
export function clearRequestTypes(): void {
    registry.clear();
}
