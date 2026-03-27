import { Schema, model, UpdateQuery } from "mongoose";
import { IUser } from "../interfaces/user.interface";

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, trim: true, match: /.+@.+\..+/ },
        password: { type: String, required: true },

        // Role & Organization
        role: { type: Schema.Types.ObjectId, ref: "Roles", required: true },
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        department: { type: Schema.Types.ObjectId, ref: "Departments" },
        country: { type: Schema.Types.ObjectId, ref: "Countries" },
        employmentTitle: { type: Schema.Types.ObjectId, ref: "EmploymentTitles" },
        manager: { type: Schema.Types.ObjectId, ref: "Users" },

        // Custom permissions
        grantedPermissions: [{ type: String, trim: true }],
        revokedPermissions: [{ type: String, trim: true }],

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: "Users", autoIndex: false },
);

UserSchema.pre("save", async function (next) {
    // Only validate if role is present and modified
    if (this.isModified("role") || this.isNew) {
        const roleValue = this.role;
        if (!roleValue) {
            return next(new Error("Role cannot be unset or null."));
        }
    }
    next();
});

UserSchema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate() as UpdateQuery<IUser>;

    if (!update || typeof update !== "object") {
        return next();
    }

    // Extract role and company from update payload (supports direct and $set updates)
    const role = (update as Partial<IUser>).role ?? (update.$set as Partial<IUser> | undefined)?.role;

    // If role is not part of the update, do nothing
    if (role === undefined) {
        return next();
    }

    // Prevent unsetting or nulling role
    if (role === null) {
        return next(new Error("Role cannot be unset or null."));
    }

    next();
});

export const UserModel = model<IUser>("Users", UserSchema);
