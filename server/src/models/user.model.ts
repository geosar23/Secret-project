import { Schema, model } from "mongoose";
import { IUser } from "../interfaces/user.interface";

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        role: { type: String, default: "employee" },
        password: { type: String, required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
);

export const UserModel = model<IUser>("User", UserSchema);
