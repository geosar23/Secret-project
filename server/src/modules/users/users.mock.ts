import { IUser } from "./user.interface";

const users: IUser[] = [
    { id: "1", email: "alice@example.com", name: "Alice Example", role: "user" } as IUser,
    { id: "2", email: "bob@example.com", name: "Bob Example", role: "admin" } as IUser,
];

export const getAllMock = (): IUser[] => users;

export const getByIdMock = (id: string): IUser | null => {
    return users.find(u => u.id === id) || null;
};

export const createMock = (data: IUser): IUser => {
    const id = String(Date.now());
    const newUser: IUser = { ...data, id } as IUser;
    users.push(newUser);
    return newUser;
};

export default {
    getAllMock,
    getByIdMock,
    createMock,
};
