import { Schema, model } from "mongoose";
import { IRequestTypeConfig } from "../interfaces/request-type-config.interface";

const RequestTypeSchema = new Schema<IRequestTypeConfig>(
    {
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        key: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true },
        kind: { type: String, enum: ["system", "custom"], required: true },
        description: { type: String, trim: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: "RequestTypes", autoIndex: false },
);

RequestTypeSchema.index({ company: 1, key: 1 }, { unique: true });

export const RequestTypeModel = model<IRequestTypeConfig>("RequestTypes", RequestTypeSchema);
