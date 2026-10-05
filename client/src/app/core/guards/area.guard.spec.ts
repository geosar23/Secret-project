import { TestBed } from "@angular/core/testing";
import { Router, UrlTree } from "@angular/router";
import { BehaviorSubject, Observable, firstValueFrom } from "rxjs";
import { areaGuard } from "./area.guard";
import { AuthService } from "../services/auth.service";
import { IUser } from "../interfaces/user.interface";

function userWith(permissions: string[]): IUser {
    return { _id: "u1", role: { permissions } } as unknown as IUser;
}

describe("areaGuard", () => {
    let localUser$: BehaviorSubject<IUser | null>;
    let authService: { localUser$: Observable<IUser | null>; getLocalUser: () => IUser | null };
    const nonAuthorizedTree = {} as UrlTree;
    let routerSpy: jasmine.SpyObj<Router>;

    beforeEach(() => {
        localUser$ = new BehaviorSubject<IUser | null>(null);
        authService = { localUser$, getLocalUser: () => localUser$.value };
        routerSpy = jasmine.createSpyObj("Router", ["createUrlTree"]);
        routerSpy.createUrlTree.and.returnValue(nonAuthorizedTree);

        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: authService },
                { provide: Router, useValue: routerSpy },
            ],
        });
    });

    const run = (area: Parameters<typeof areaGuard>[0]) =>
        firstValueFrom(
            TestBed.runInInjectionContext(() => areaGuard(area)({} as never, {} as never)) as Observable<
                boolean | UrlTree
            >,
        );

    it("allows a user with a read permission for the area", async () => {
        localUser$.next(userWith(["rolesManagement:read:*"]));
        expect(await run("roles")).toBeTrue();
    });

    it("allows a user with only a write permission for the area", async () => {
        localUser$.next(userWith(["departmentsManagement:write:*"]));
        expect(await run("departments")).toBeTrue();
    });

    it("redirects to /non-authorized when the user lacks permission", async () => {
        localUser$.next(userWith(["usersManagement:read:*"]));
        expect(await run("roles")).toBe(nonAuthorizedTree);
        expect(routerSpy.createUrlTree).toHaveBeenCalledWith(["/non-authorized"]);
    });

    it("waits until the current user has loaded", async () => {
        const pending = run("roles");
        localUser$.next(userWith(["*:*:*"]));
        expect(await pending).toBeTrue();
    });
});
