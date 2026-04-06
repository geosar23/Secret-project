import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { authGuard } from "./auth.guard";
import { AuthService } from "../services/auth.service";

describe("authGuard", () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let routerSpy: jasmine.SpyObj<Router>;

    beforeEach(() => {
        authServiceSpy = jasmine.createSpyObj("AuthService", ["isAuthenticated"]);
        routerSpy = jasmine.createSpyObj("Router", ["navigate"]);

        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: authServiceSpy },
                { provide: Router, useValue: routerSpy },
            ],
        });
    });

    function runGuard(): boolean | ReturnType<typeof authGuard> {
        return TestBed.runInInjectionContext(() => authGuard());
    }

    it("returns true when the user is authenticated", () => {
        authServiceSpy.isAuthenticated.and.returnValue(true);

        const result = runGuard();

        expect(result).toBe(true);
        expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it("redirects to /login and returns false when unauthenticated", () => {
        authServiceSpy.isAuthenticated.and.returnValue(false);

        const result = runGuard();

        expect(result).toBe(false);
        expect(routerSpy.navigate).toHaveBeenCalledWith(["/login"]);
    });
});
