import { Schema, model, UpdateQuery } from "mongoose";
import { IUser } from "../interfaces/user.interface";
import bcrypt from "bcryptjs";
import { Gender, MaritalStatus, EmploymentType, DegreeLevel } from "../enums/profile.enum";

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

const EmergencyContactSchema = new Schema(
    {
        name: { type: String, trim: true },
        relationship: { type: String, trim: true },
        phone: { type: String, trim: true },
    },
    { _id: false },
);

const EducationEntrySchema = new Schema(
    {
        institution: { type: String, trim: true },
        degreeLevel: { type: String, enum: Object.values(DegreeLevel), trim: true },
        degreeTitle: { type: String, trim: true },
        yearAchieved: { type: Number },
    },
    { _id: false },
);

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, trim: true, match: /.+@.+\..+/ },
        password: { type: String, required: true },

        // Role & Organization
        role: { type: Schema.Types.ObjectId, ref: "Roles", required: true },
        company: { type: Schema.Types.ObjectId, ref: "Companies", required: true },
        country: { type: Schema.Types.ObjectId, ref: "Countries" },
        primaryDepartment: { type: Schema.Types.ObjectId, ref: "Departments", index: true },
        primarySubDepartment: { type: Schema.Types.ObjectId, ref: "SubDepartments" },
        secondaryDepartments: [{ type: Schema.Types.ObjectId, ref: "Departments", index: true }],
        secondarySubDepartments: [{ type: Schema.Types.ObjectId, ref: "SubDepartments" }],
        employmentTitle: { type: Schema.Types.ObjectId, ref: "EmploymentTitles" },
        manager: { type: Schema.Types.ObjectId, ref: "Users" },
        level: { type: Schema.Types.ObjectId, ref: "Levels" },
        office: { type: Schema.Types.ObjectId, ref: "Offices" },
        hrRepresentative: { type: Schema.Types.ObjectId, ref: "Users" },
        workSchedule: { type: Schema.Types.ObjectId, ref: "WorkSchedules" },

        // Identity
        legalName: { type: String, trim: true },
        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },
        personalEmail: { type: String, trim: true, match: /.+@.+\..+/ },
        gender: { type: String, enum: Object.values(Gender), trim: true },
        birthday: { type: Date },
        maritalStatus: { type: String, enum: Object.values(MaritalStatus), trim: true },
        nationalities: [{ type: String, trim: true }],
        religion: { type: String, trim: true },

        // Contact
        workPhone: { type: String, trim: true },
        personalPhone: { type: String, trim: true },
        additionalPhones: [{ type: String, trim: true }],
        currentAddress: { type: AddressSchema },
        homeCountryAddress: { type: AddressSchema },
        homeCountryPhone: { type: String, trim: true },
        emergencyContact: { type: EmergencyContactSchema },

        // Employment
        employmentDate: { type: Date },
        employmentType: { type: String, enum: Object.values(EmploymentType), trim: true },
        payrollId: { type: String, trim: true },
        isOutsourced: { type: Boolean, default: false },

        // Education
        education: [EducationEntrySchema],

        // Compensation (AES-256-GCM encrypted)
        salary: { type: String },

        // Custom permissions
        grantedPermissions: [{ type: String, trim: true }],
        revokedPermissions: [{ type: String, trim: true }],

        profileImage: {
            bucket: { type: String, trim: true },
            path: { type: String, trim: true },
            originalName: { type: String, trim: true },
            mimeType: { type: String, trim: true },
            size: { type: Number },
            uploadedAt: { type: Date },
        },

        isActive: { type: Boolean, default: true },

        // Credential / JWT revocation state
        jwtTokenRevokedAt: { type: Date, default: null },
        mustChangePassword: { type: Boolean, default: false },
        temporaryPasswordExpiresAt: { type: Date, default: null },
    },
    { timestamps: true, collection: "Users", autoIndex: false },
);

UserSchema.pre("save", async function (next) {
    if (this.isModified("password") && typeof this.password === "string") {
        const isAlreadyHashed = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.password);
        if (!isAlreadyHashed) {
            this.password = await bcrypt.hash(this.password, 10);
        }
    }

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
