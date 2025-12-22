import { IPermission } from "./permission.interface";
import { IRole } from "./role.interface";
import { IUser } from "./user.interface";

 export type PopulatedPermission = Pick<IPermission, "key">;
export type PopulatedRole = IRole & { permissions: PopulatedPermission[] };
export type PopulatedUser = IUser & {
    role: PopulatedRole;
    grantedPermissions: PopulatedPermission[];
    revokedPermissions: PopulatedPermission[];
};