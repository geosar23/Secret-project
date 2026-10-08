import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { RoleModel } from "../../models/role.model";
import { UserModel } from "../../models/user.model";
import { config } from "../../config/env";

export const TEST_COMPANY_ID = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");

// Distinct company IDs for isolation tests.
export const COMPANY_A_ID = new mongoose.Types.ObjectId("aaaaaaaaaaaaaaaaaaaaaaaa");
export const COMPANY_B_ID = new mongoose.Types.ObjectId("bbbbbbbbbbbbbbbbbbbbbbbb");

export interface SeededUser {
    _id: mongoose.Types.ObjectId;
    email: string;
    plainPassword: string;
    token: string;
    companyId: mongoose.Types.ObjectId;
}

function makeToken(
    user: { _id: mongoose.Types.ObjectId; email: string; name: string },
    roleId: string,
    companyId: mongoose.Types.ObjectId,
): string {
    return jwt.sign(
        {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            roleId,
            companyId: companyId.toString(),
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
        permissions: ["*:*:*"],
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
        companyId: TEST_COMPANY_ID,
        token: makeToken(
            { _id: user._id as mongoose.Types.ObjectId, email: user.email, name: user.name },
            role._id.toString(),
            TEST_COMPANY_ID,
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
        companyId: TEST_COMPANY_ID,
        token: makeToken(
            { _id: user._id as mongoose.Types.ObjectId, email: user.email, name: user.name },
            role._id.toString(),
            TEST_COMPANY_ID,
        ),
    };
}

/**
 * Seeds a user belonging to the given company with the given permissions.
 */
export async function seedUserInCompany(opts: {
    companyId: mongoose.Types.ObjectId;
    email: string;
    name: string;
    permissions: string[];
    roleKey: string;
    manager?: mongoose.Types.ObjectId;
    hrRepresentative?: mongoose.Types.ObjectId;
    isActive?: boolean;
}): Promise<SeededUser> {
    const role = await RoleModel.create({
        role: opts.roleKey,
        name: `Role-${opts.roleKey}`,
        description: `Test role ${opts.roleKey}`,
        level: 3,
        permissions: opts.permissions,
        isSystemRole: false,
        company: opts.companyId,
    });

    const plainPassword = "Test@Company1";
    const user = await UserModel.create({
        name: opts.name,
        email: opts.email,
        password: plainPassword,
        role: role._id,
        company: opts.companyId,
        manager: opts.manager,
        hrRepresentative: opts.hrRepresentative,
        isActive: opts.isActive ?? true,
    });

    return {
        _id: user._id as mongoose.Types.ObjectId,
        email: user.email,
        plainPassword,
        companyId: opts.companyId,
        token: makeToken(
            { _id: user._id as mongoose.Types.ObjectId, email: user.email, name: user.name },
            role._id.toString(),
            opts.companyId,
        ),
    };
}
