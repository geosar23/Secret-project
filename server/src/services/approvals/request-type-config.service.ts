import { requestTypeRepository } from "../../repositories/request-type.repository";
import { BadRequestError } from "../../utils/app-error.util";
import { FlowService } from "./flow.service";
import { getRequestType, listRequestTypes } from "./request-type.registry";

/** Company configuration of request types (the `RequestTypes` collection). Behaviour stays in the registry. */
export const RequestTypeConfigService = {
    /** Active types a company offers, for pickers and filters. */
    listActive: (companyId: string) =>
        requestTypeRepository(companyId)
            .find({ isActive: true })
            .select("key name kind description")
            .sort({ name: 1 })
            .lean(),

    /** Throws unless the company has the type enabled and the code knows how to run it. */
    assertUsable: async (companyId: string, key: string): Promise<void> => {
        const config = await requestTypeRepository(companyId).findOne({ key, isActive: true }).lean();
        if (!config) {
            throw new BadRequestError(`Request type "${key}" is not enabled`);
        }
        if (config.kind === "system") {
            getRequestType(key); // throws when no behaviour is registered
            return;
        }
        throw new BadRequestError(`Custom request types are not supported yet ("${key}")`);
    },

    /**
     * Idempotent: creates the RequestTypes row and the company-wide default flow (version 1) for every registered
     * system type the company does not have yet. Existing rows and flows are never changed.
     */
    ensureSystemTypes: async (companyId: string, createdBy: string): Promise<string[]> => {
        const repo = requestTypeRepository(companyId);
        const created: string[] = [];
        for (const definition of listRequestTypes()) {
            if (!(await repo.findOne({ key: definition.type }).lean())) {
                await repo.create({ key: definition.type, name: definition.name, kind: "system", isActive: true });
                created.push(definition.type);
            }
            await FlowService.ensureDefault(companyId, definition.type, createdBy);
        }
        return created;
    },
};
