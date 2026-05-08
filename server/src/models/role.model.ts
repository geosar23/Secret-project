import { Schema, model } from "mongoose";
import { IRole } from "../interfaces/role.interface";
import { DefaultUserRoles } from "../enums/user-role.enum";

const RoleSchema = new Schema<IRole>(
    {
        role: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            validate: {
                validator: function (this: IRole, value: string) {
                    // System roles must use predefined DefaultUserRoles enum values
                    if (this.isSystemRole) {
                        return Object.values(DefaultUserRoles).includes(value as DefaultUserRoles);
                    }
                    // Custom roles can have any string value
                    return true;
                },
                message: "System roles must use predefined role values (SUPER_ADMIN, ADMIN, HR, MANAGER, EMPLOYEE)",
            },
        },
        name: { type: String, required: true, trim: true, unique: true },
        description: { type: String, required: true, trim: true },
        level: { type: Number, required: true },
        permissions: [{ type: String, trim: true }],
        isSystemRole: { type: Boolean, default: false },
        company: {
            type: Schema.Types.ObjectId,
            ref: "Companies",
            // All roles (system and custom) must be scoped to a company.
            validate: {
                validator: function (value: string) {
                    return !!value;
                },
                message: "All roles must be assigned to a company",
            },
        },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
        collection: "Roles", // Use capital R to match MongoDB collection name
        autoIndex: false, // Disable automatic index creation
    },
);

RoleSchema.pre("save", function (next) {
    if (this.isNew && this.isSystemRole) {
        next(new Error("System roles cannot be created. Only custom roles can be created."));
    } else if (this.isSystemRole && this.isModified("isActive") && this.isActive === false) {
        next(new Error("System roles cannot be set to inactive"));
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

RoleSchema.pre("findOneAndDelete", function (next) {
    this.model
        .findOne(this.getFilter())
        .then(doc => {
            if (doc?.isSystemRole) {
                next(new Error("System roles cannot be deleted"));
            } else {
                next();
            }
        })
        .catch(next);
});

RoleSchema.pre("findOneAndUpdate", function (next) {
    const update = this.getUpdate();
    const isActiveUpdate =
        (update && typeof update === "object" && "isActive" in update && update.isActive === false) ||
        (update && typeof update === "object" && "$set" in update && update.$set && update.$set.isActive === false);
    if (isActiveUpdate) {
        this.model
            .findOne(this.getFilter())
            .then(doc => {
                if (doc?.isSystemRole) {
                    next(new Error("System roles cannot be set to inactive"));
                } else {
                    next();
                }
            })
            .catch(next);
    } else {
        next();
    }
});

export const RoleModel = model<IRole>("Roles", RoleSchema);
