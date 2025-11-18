import { UserModel } from './user.model'
import { IUser } from './user.interface'
import { getAllMock, getByIdMock, createMock } from './users.mock'

const USE_MOCK = process.env.USE_MOCK_DB === 'true'
console.log('USE_MOCK_DB:', USE_MOCK, process.env.USE_MOCK_DB)

export const UserService = {
    getAll: () => (USE_MOCK ? Promise.resolve(getAllMock()) : UserModel.find()),
    getById: (id: string) => (USE_MOCK ? Promise.resolve(getByIdMock(id)) : UserModel.findById(id)),
    create: (data: IUser) =>
        USE_MOCK ? Promise.resolve(createMock(data)) : UserModel.create(data),
}
