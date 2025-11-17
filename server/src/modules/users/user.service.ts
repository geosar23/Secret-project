import { UserModel } from "./user.model";
import { IUser } from "./user.interface";

export const UserService = {
  getAll: () => UserModel.find(),
  getById: (id: string) => UserModel.findById(id),
  create: (data: IUser) => UserModel.create(data),
};
