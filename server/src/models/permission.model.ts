import { Schema, model } from "mongoose";
import { IPermission } from "../interfaces/permission.interface";

const PermissionSchema = new Schema<IPermission>(
    {
        permission: { type: String, required: true, unique: true },
        entity: { type: String, required: true },
        action: { type: String, required: true },
        scope: { type: String, required: true },
        description: { type: String, required: true },
        category: { type: String, required: true },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
        collection: "Permissions", // Use capital P to match MongoDB collection name
    },
);

// Indexes for performance
PermissionSchema.index({ permission: 1 });
PermissionSchema.index({ category: 1 });
PermissionSchema.index({ entity: 1 });
PermissionSchema.index({ isActive: 1 });

export const PermissionModel = model<IPermission>("Permission", PermissionSchema);
