import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { IUser } from "../interfaces/user.interface";
import { UserService } from "../services/user.service";
import { toIdString } from "./general.util";

export async function getActorUser(req: AuthenticatedRequest): Promise<IUser | null> {
    const actor = req.decoded as tokenPayload;

    if (!actor?.companyId) {
        return null;
    }

    return (await UserService.getById(actor.id, actor.companyId)) as IUser | null;
}

export function getActorCompanyId(user: IUser): string | undefined {
    return toIdString(user.company);
}
