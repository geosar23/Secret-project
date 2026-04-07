import { Schema, model } from "mongoose";
import { IOffice } from "../interfaces/office.interface";

const AddressSchema = new Schema(
    {
        line1: { type: String, trim: true },
        line2: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        postalCode: { type: String, trim: true },
        country: { type: String, trim: true },
    },
    { _id: false },
);

const OfficeSchema = new Schema<IOffice>(
    {
        name: { type: String, required: true, trim: true },
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        country: { type: Schema.Types.ObjectId, ref: "Countries" },
        address: { type: AddressSchema },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: "Offices", autoIndex: false },
);

export const OfficeModel = model<IOffice>("Offices", OfficeSchema);
