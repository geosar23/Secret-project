import { Injectable, computed, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { catchError, distinctUntilChanged, map, of, switchMap } from "rxjs";
import { AuthService } from "./auth.service";
import { UsersService } from "./users.service";

/** Signals derived from the logged-in user, shared by the header and dashboard. */
@Injectable({ providedIn: "root" })
export class CurrentUserService {
    private authService = inject(AuthService);
    private usersService = inject(UsersService);

    readonly user = toSignal(this.authService.localUser$, { initialValue: null });

    readonly profileImageUrl = toSignal(
        this.authService.localUser$.pipe(
            distinctUntilChanged((a, b) => a?._id === b?._id && !!a?.profileImage === !!b?.profileImage),
            switchMap(user =>
                user?._id && user.profileImage
                    ? this.usersService.getProfileImageUrl(user._id).pipe(
                          map(res => (res.success ? (res.data?.url ?? null) : null)),
                          catchError(() => of(null)),
                      )
                    : of(null),
            ),
        ),
        { initialValue: null },
    );

    readonly initials = computed(() => {
        const parts = (this.user()?.name ?? "").trim().split(/\s+/).filter(Boolean);
        return parts
            .slice(0, 2)
            .map(p => p[0].toUpperCase())
            .join("");
    });
}
