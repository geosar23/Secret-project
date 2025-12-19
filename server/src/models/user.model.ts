import { Schema, model } from "mongoose";
import { IUser } from "../interfaces/user.interface";
import { DefaultUserRoles } from "../enums/user-role.enum";
import { RoleModel } from "./role.model";

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, trim: true, match: /.+@.+\..+/ },
        password: { type: String, required: true },

        // Role & Organization
        role: {
            type: String,
            required: true,
            default: DefaultUserRoles.EMPLOYEE,
            lowercase: true,
            trim: true,
            ref: "Roles",
        },
        companyId: { type: Schema.Types.ObjectId, ref: "Companies" },
        departmentId: { type: Schema.Types.ObjectId, ref: "Departments" },
        managerId: { type: Schema.Types.ObjectId, ref: "Users" },
        managedDepartments: [{ type: Schema.Types.ObjectId, ref: "Departments" }],

        // Custom permissions
        grantedPermissions: [{ type: String, ref: "Permissions" }],
        revokedPermissions: [{ type: String, ref: "Permissions" }],

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

export const UserModel = model<IUser>("Users", UserSchema);
