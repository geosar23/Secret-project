import { Schema, model } from "mongoose";
import { IPermission } from "../interfaces/permission.interface";
import { PermissionActions, PermissionCategories, PermissionScopes } from "../enums/permissions.enum";

const PermissionSchema = new Schema<IPermission>(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            // Examples: "users.create", "users.view", "requests.leaves.approve"
        },
        name: {
            type: String,
            required: true,
            // Examples: "Create Users", "View Users", "Approve Leave Requests"
        },
        description: {
            type: String,
            required: true,
            // Detailed explanation of what this permission allows
        },
        category: {
            type: String,
            required: true,
            enum: Object.values(PermissionCategories),
            // Used for grouping permissions in UI
        },
        scope: {
            type: String,
            enum: Object.values(PermissionScopes),
        },
        action: {
            type: String,
            enum: Object.values(PermissionActions),
        },
        isActive: {
            type: Boolean,
            default: true,
            // Soft delete: inactive permissions are hidden but preserved
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
        collection: "Permissions", // Use capital P to match MongoDB collection name
        autoIndex: false, // Disable automatic index creation
    },
);

export const PermissionModel = model<IPermission>("Permission", PermissionSchema);
