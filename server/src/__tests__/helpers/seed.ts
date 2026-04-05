import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { RoleModel } from "../../models/role.model";
import { UserModel } from "../../models/user.model";
import { PermissionKeys } from "../../enums/permissions.enum";
import { config } from "../../config/env";

// Fixed ObjectId that matches process.env.OG_COMPANY_ID set in setup.env.ts.
// With this match, userRepository returns the base UserModel (no company-scope filter),
// which simplifies seeding and querying in tests.
export const TEST_COMPANY_ID = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");

export interface SeededUser {
    _id: mongoose.Types.ObjectId;
    email: string;
    plainPassword: string;
    token: string;
}

function makeToken(user: { _id: mongoose.Types.ObjectId; email: string; name: string }, roleId: string): string {
    return jwt.sign(
        {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            roleId,
            companyId: TEST_COMPANY_ID.toString(),
        },
        config.JWT_SECRET,
        { expiresIn: "1h" },
    );
}

export async function seedAdminUser(): Promise<SeededUser> {
    const role = await RoleModel.create({
        role: "test-admin",
        name: "Test Admin Role",
        description: "Test admin role with all permissions",
        level: 1,
        permissions: [PermissionKeys.ALL],
        isSystemRole: false,
        company: TEST_COMPANY_ID,
    });

    const plainPassword = "Test@Admin1";
    const user = await UserModel.create({
        name: "Test Admin",
        email: "admin@test.com",
        password: plainPassword,
        role: role._id,
        company: TEST_COMPANY_ID,
        isActive: true,
    });

    return {
        _id: user._id as mongoose.Types.ObjectId,
        email: user.email,
        plainPassword,
        token: makeToken(
            { _id: user._id as mongoose.Types.ObjectId, email: user.email, name: user.name },
            role._id.toString(),
        ),
    };
}

export async function seedEmployeeUser(): Promise<SeededUser> {
    const role = await RoleModel.create({
        role: "test-employee",
        name: "Test Employee Role",
        description: "Test employee role with no permissions",
        level: 5,
        permissions: [],
        isSystemRole: false,
        company: TEST_COMPANY_ID,
    });

    const plainPassword = "Test@Employee1";
    const user = await UserModel.create({
        name: "Test Employee",
        email: "employee@test.com",
        password: plainPassword,
        role: role._id,
        company: TEST_COMPANY_ID,
        isActive: true,
    });

    return {
        _id: user._id as mongoose.Types.ObjectId,
        email: user.email,
        plainPassword,
        token: makeToken(
            { _id: user._id as mongoose.Types.ObjectId, email: user.email, name: user.name },
            role._id.toString(),
        ),
    };
}
