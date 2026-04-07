import { Schema, model } from "mongoose";
import { ILevel } from "../interfaces/level.interface";

const LevelSchema = new Schema<ILevel>(
    {
        name: { type: String, required: true, trim: true },
        order: { type: Number, default: 0 },
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: "Levels", autoIndex: false },
);

export const LevelModel = model<ILevel>("Levels", LevelSchema);
