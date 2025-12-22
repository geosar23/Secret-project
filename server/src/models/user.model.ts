import { Schema, model, UpdateQuery } from "mongoose";
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
    const update = this.getUpdate() as UpdateQuery<IUser>;

    if (!update || typeof update !== "object") {
        return next();
    }

    // Extract role and company from update payload (supports direct and $set updates)
    const role = (update as Partial<IUser>).role ?? (update.$set as Partial<IUser> | undefined)?.role;
    const company = (update as Partial<IUser>).company ?? (update.$set as Partial<IUser> | undefined)?.company;

    // If role is not part of the update, do nothing
    if (role === undefined) {
        return next();
    }

    // Prevent unsetting or nulling role
    if (role === null) {
        return next(new Error("Role cannot be unset or null."));
    }

    // Validate role existence
    const roleExists = await RoleModel.exists({ _id: role });
    if (!roleExists) {
        return next(new Error(`Role '${role}' does not exist in Roles collection.`));
    }

    // If user has a company, validate that the role exists in that company
    const userBeingUpdated = await this.model.findOne(this.getFilter());
    console.log("User being updated:", userBeingUpdated);
    const userCompany = company ?? userBeingUpdated?.company;

    if (userCompany) {
        const roleInCompany = await RoleModel.exists({ _id: role, company: userCompany });
        if (!roleInCompany) {
            return next(new Error(`Role '${role}' does not exist in company '${userCompany}'.`));
        }
    }

    next();
});

export const UserModel = model<IUser>("Users", UserSchema);
