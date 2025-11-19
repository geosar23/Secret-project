import { UserModel } from "../../models/user.model";
import { IUser } from "../../interfaces/user.interface";
import { MockDatabase } from "../../db/mock-database";

const USE_MOCK = process.env.USE_MOCK_DB === "true";

export const UserService = {
    getAll: () => (USE_MOCK ? Promise.resolve(MockDatabase.getAllUsers()) : UserModel.find()),
    getById: (id: string) =>
        USE_MOCK ? Promise.resolve(MockDatabase.getUserById(id)) : UserModel.findById(id),
    getByEmail: (email: string) =>
        USE_MOCK
            ? Promise.resolve(MockDatabase.getUserByEmail(email))
            : UserModel.findOne({ email }),
    create: (data: Omit<IUser, "_id">) =>
        USE_MOCK ? Promise.resolve(MockDatabase.createUser(data)) : UserModel.create(data),
    update: (id: string, data: Partial<IUser>) =>
        USE_MOCK
            ? Promise.resolve(MockDatabase.updateUser(id, data))
            : UserModel.findByIdAndUpdate(id, data, { new: true }),
    delete: (id: string) =>
        USE_MOCK ? Promise.resolve(MockDatabase.deleteUser(id)) : UserModel.findByIdAndDelete(id),
};
