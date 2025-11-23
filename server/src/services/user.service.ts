import { UserModel } from "../models/user.model";
import { IUser } from "../interfaces/user.interface";
import { MockDatabase } from "../db/mock-database";
import { dbState } from "../config/databases";

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
};
