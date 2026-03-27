import { Schema, model } from "mongoose";
import { ICountry } from "../interfaces/country.interface";

const CountrySchema = new Schema<ICountry>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: "" },
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true, index: true },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: "Countries",
        autoIndex: false,
    },
);

CountrySchema.index({ company: 1, name: 1 }, { unique: true });

export const CountryModel = model<ICountry>("Countries", CountrySchema);
