import { Schema, model } from "mongoose";
import { IUser } from "../interfaces/user.interface";
import { RoleModel } from "./role.model";
import "./company.model";

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, trim: true, match: /.+@.+\..+/ },
        password: { type: String, required: true },

        // Role & Organization
        role: { type: Schema.Types.ObjectId, ref: "Roles", required: true },
        company: { type: Schema.Types.ObjectId, ref: "Companies" },
        department: { type: Schema.Types.ObjectId, ref: "Departments" },
        manager: { type: Schema.Types.ObjectId, ref: "Users" },

        // Custom permissions
        grantedPermissions: [{ type: Schema.Types.ObjectId, ref: "Permissions" }],
        revokedPermissions: [{ type: Schema.Types.ObjectId, ref: "Permissions" }],

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
        if (!roleValue) {
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
