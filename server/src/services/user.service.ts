import { UserModel } from "../models/user.model";
import { IUser } from "../interfaces/user.interface";
import { MockDatabase } from "../db/mock-database";
import { dbState } from "../config/databases";
import { AuthResponse, RegisterDto } from "../interfaces/auth.interface";
import { UserRole } from "../enums/user-role.enum";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const UserService = {
    getAll: () =>
        dbState.useMock ? Promise.resolve(MockDatabase.getAllUsers()) : UserModel.find(),
    getById: (id: string) =>
        dbState.useMock ? Promise.resolve(MockDatabase.getUserById(id)) : UserModel.findById(id),
    getByEmail: (email: string) =>
        dbState.useMock
            ? Promise.resolve(MockDatabase.getUserByEmail(email))
            : UserModel.findOne({ email }),
    create: (data: Omit<IUser, "_id">) =>
        dbState.useMock ? Promise.resolve(MockDatabase.createUser(data)) : UserModel.create(data),
    update: (id: string, data: Partial<IUser>) =>
        dbState.useMock
            ? Promise.resolve(MockDatabase.updateUser(id, data))
            : UserModel.findByIdAndUpdate(id, data, { new: true }),
    delete: (id: string) =>
        dbState.useMock
            ? Promise.resolve(MockDatabase.deleteUser(id))
            : UserModel.findByIdAndDelete(id),
    async register(data: RegisterDto): Promise<AuthResponse> {
        const { name, email, password, role = UserRole.EMPLOYEE } = data;

        // Check if user already exists
        const existingUser = await UserService.getByEmail(email);
        if (existingUser) {
            throw new Error("User already exists");
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await UserService.create({
            name,
            email,
            password: hashedPassword,
            role,
            isActive: true,
            createdAt: new Date(),
        });

        // Generate JWT token
        const token = jwt.sign(
            {
                id: newUser._id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
        );

        return {
            token,
            user: {
                id: newUser._id || "",
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
            },
        };
    },
};
