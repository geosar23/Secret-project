import { Schema } from "mongoose";

/**
 * Company Plugin: Automatically filters queries to the current company
 * Applied to schemas that have a 'company' field
 */
export const companyPlugin = (schema: Schema, options?: { companyField?: string }) => {
    const companyField = options?.companyField || "company";

    /**
     * Apply company filtering to all find operations
     * Only filters if a company context is available in the query context
     */
    schema.pre(/^find/, function (next) {
        // Get company context from query (set by routes/middleware)
        const companyId = (this as { companyId?: string }).companyId;

        // If a company is specified, filter by it
        // This prevents cross-company data leakage
        if (companyId) {
            this.where({ [companyField]: companyId });
        }

        next();
    });

    /**
     * Apply company filtering to findOneAndUpdate operations
     */
    schema.pre("findOneAndUpdate", function (next) {
        const companyId = (this as { companyId?: string }).companyId;

        if (companyId) {
            this.where({ [companyField]: companyId });
        }

        next();
    });

    /**
     * Apply company filtering to findOneAndDelete operations
     */
    schema.pre("findOneAndDelete", function (next) {
        const companyId = (this as { companyId?: string }).companyId;

        if (companyId) {
            this.where({ [companyField]: companyId });
        }

        next();
    });

    /**
     * Helper method to set company context for a query
     * Usage: Model.find().setCompany(companyId)
     */
    (schema.query as Record<string, unknown>).setCompany = function (companyId: string) {
        return (this as { where(filter: Record<string, string>): unknown }).where({ [companyField]: companyId });
    };
};
