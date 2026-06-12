import { inject } from "@angular/core";
import { ResolveFn, RedirectCommand, Router } from "@angular/router";
import { forkJoin, map } from "rxjs";
import { UsersService } from "../../../core/services/users.service";
import { IEditUserContext } from "../../../core/interfaces/user.interface";

export const editUserContextResolver: ResolveFn<IEditUserContext | RedirectCommand> = route => {
    const usersService = inject(UsersService);
    const router = inject(Router);

    const userId = route.paramMap.get("id")!;

    return forkJoin({
        subjectRes: usersService.getUserById(userId),
        accessRes: usersService.getAccessForSubject(userId),
    }).pipe(
        map(({ subjectRes, accessRes }) => {
            if (!subjectRes.success || !subjectRes.data) {
                return new RedirectCommand(router.parseUrl("/users"));
            }
            if (!accessRes.success || !accessRes.data?.canEdit) {
                return new RedirectCommand(router.parseUrl("/non-authorized"));
            }
            return {
                user: subjectRes.data,
                access: accessRes.data,
            };
        }),
    );
};
