import { Schema, model } from "mongoose";
import { IRole } from "../interfaces/role.interface";
import { UserRole } from "../enums/user-role.enum";

const RoleSchema = new Schema<IRole>(
    {
        role: {
            type: String,
            enum: Object.values(UserRole),
            required: true,
            unique: true,
        },
        name: { type: String, required: true },
        description: { type: String, required: true },
        level: { type: Number, required: true },
        permissions: [{ type: String }],
        isSystemRole: { type: Boolean, default: false },
        companyId: { type: String },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
        collection: "Roles", // Use capital R to match MongoDB collection name
    },
);

// Indexes for performance
RoleSchema.index({ role: 1 });
RoleSchema.index({ companyId: 1 });
RoleSchema.index({ level: -1 });

export const RoleModel = model<IRole>("Role", RoleSchema);
