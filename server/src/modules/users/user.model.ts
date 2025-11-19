import { Schema, model } from "mongoose";
import { IUser } from "./user.interface";

const UserSchema = new Schema<IUser>({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, default: "employee" },
    password: { type: String, required: true },
});

export const UserModel = model<IUser>("User", UserSchema);
