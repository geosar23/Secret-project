import { Schema, model } from "mongoose";
import { IUser } from "../interfaces/user.interface";
import { DefaultUserRoles } from "../enums/user-role.enum";
import { RoleModel } from "./role.model";

const GrantedPermissionSchema = new Schema(
    {
        permission: { type: String, required: true },
        grantedBy: { type: String, required: true },
        grantedAt: { type: Date, required: true },
        expiresAt: { type: Date },
        reason: { type: String },
        scope: { type: String },
    },
    { _id: false },
);

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, match: /.+@.+\..+/ },
        password: { type: String, required: true },

        // Role & Organization
        role: { type: String, required: true, default: DefaultUserRoles.EMPLOYEE },
        companyId: { type: String },
        departmentId: { type: String },
        managerId: { type: String },
        managedDepartments: [{ type: String }],

        // Custom permissions
        grantedPermissions: [GrantedPermissionSchema],
        revokedPermissions: [{ type: String }],

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: "Users", autoIndex: false },
);

UserSchema.pre("save", async function (next) {
    // Only validate if role is present and modified
    if (this.isModified("role") || this.isNew) {
        const roleValue = this.role;
        const roleExists = await RoleModel.exists({ role: roleValue });
        if (!roleExists) {
            return next(new Error(`Role '${roleValue}' does not exist in Roles collection.`));
        }
        if (roleValue === null || roleValue === undefined) {
            return next(new Error("Role cannot be unset or null."));
        }
    }
    next();
});

UserSchema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate();
    let roleValue;
    if (update && typeof update === "object") {
        if ("role" in update) {
            roleValue = update.role;
        } else if ("$set" in update && update.$set && update.$set.role) {
            roleValue = update.$set.role;
        }
    }
    if (roleValue) {
        const roleExists = await RoleModel.exists({ role: roleValue });
        if (!roleExists) {
            return next(new Error(`Role '${roleValue}' does not exist in Roles collection.`));
        }
    }
    if (roleValue === null || roleValue === undefined) {
        return next(new Error("Role cannot be unset or null."));
    }
    next();
});

export const UserModel = model<IUser>("User", UserSchema);
