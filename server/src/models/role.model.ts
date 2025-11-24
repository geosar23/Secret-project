import { Schema, model } from "mongoose";
import { IRole } from "../interfaces/role.interface";
import { UserRole } from "../enums/user-role.enum";

const RoleSchema = new Schema<IRole>(
    {
        role: {
            type: String,
            enum: Object.values(UserRole),
            required: true,
        },
        name: { type: String, required: true },
        description: { type: String, required: true },
        level: { type: Number, required: true },
        permissions: [{ type: String }],
        isSystemRole: { type: Boolean, default: false },
        companyId: {
            type: String,
            // companyId is required for custom roles, not allowed for system roles
            validate: {
                validator: function (this: IRole, value: string | undefined) {
                    if (this.isSystemRole) {
                        return !value; // System roles should not have companyId
                    }
                    return !!value; // Custom roles must have companyId
                },
                message: (props: { value: string }) =>
                    props.value
                        ? "System roles cannot be assigned to a specific company"
                        : "Custom roles must be assigned to a company",
            },
        },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
        collection: "Roles", // Use capital R to match MongoDB collection name
    },
);

// Prevent creation of new system roles (only custom roles can be created)
RoleSchema.pre("save", function (next) {
    if (this.isNew && this.isSystemRole) {
        next(new Error("System roles cannot be created. Only custom roles can be created."));
    } else {
        next();
    }
});

// Prevent deletion of system roles
RoleSchema.pre("deleteOne", { document: true, query: false }, function (next) {
    if (this.isSystemRole) {
        next(new Error("System roles cannot be deleted"));
    } else {
        next();
    }
});

RoleSchema.pre("deleteOne", { document: false, query: true }, function (next) {
    this.model.findOne(this.getFilter()).then(doc => {
        if (doc?.isSystemRole) {
            next(new Error("System roles cannot be deleted"));
        } else {
            next();
        }
    }).catch(next);
});

RoleSchema.pre("findOneAndDelete", function (next) {
    this.model.findOne(this.getFilter()).then(doc => {
        if (doc?.isSystemRole) {
            next(new Error("System roles cannot be deleted"));
        } else {
            next();
        }
    }).catch(next);
});

// Indexes for performance
RoleSchema.index({ role: 1, companyId: 1 }, { unique: true, sparse: true }); // Unique role per company
RoleSchema.index({ companyId: 1, isActive: 1 }); // Query active roles by company
RoleSchema.index({ isSystemRole: 1 }); // Query system vs custom roles
RoleSchema.index({ level: -1 });

export const RoleModel = model<IRole>("Role", RoleSchema);
