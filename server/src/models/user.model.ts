import { Schema, model } from "mongoose";
import { IUser } from "../interfaces/user.interface";
import { UserRole } from "../core/permissions/roles.enum";

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
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },

        // Role & Organization
        role: { type: String, enum: Object.values(UserRole), default: UserRole.EMPLOYEE },
        companyId: { type: String },
        departmentId: { type: String },
        managerId: { type: String },
        managedDepartments: [{ type: String }],

        // Custom permissions
        grantedPermissions: [GrantedPermissionSchema],
        revokedPermissions: [{ type: String }],

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
);

export const UserModel = model<IUser>("User", UserSchema);
