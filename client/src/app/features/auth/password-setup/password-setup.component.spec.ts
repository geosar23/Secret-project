import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from "@angular/router";
import { of, throwError } from "rxjs";
import { PasswordSetupComponent } from "./password-setup.component";
import { AuthService } from "../../../core/services/auth.service";
import { ToastService } from "../../../core/services/toast.service";
import { UsersService } from "../../../core/services/users.service";

describe("PasswordSetupComponent", () => {
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let usersServiceSpy: jasmine.SpyObj<UsersService>;
    let toastSpy: jasmine.SpyObj<ToastService>;
    let router: Router;

    // A JWT-shaped token whose payload is {"id":"user-1"}.
    const jwt = `h.${btoa(JSON.stringify({ id: "user-1" }))}.s`;

    async function create(query: Record<string, string>, authenticated = false) {
        authServiceSpy = jasmine.createSpyObj("AuthService", [
            "setupPassword",
            "isAuthenticated",
            "getToken",
            "logout",
        ]);
        authServiceSpy.isAuthenticated.and.returnValue(authenticated);
        authServiceSpy.getToken.and.returnValue(authenticated ? jwt : null);
        usersServiceSpy = jasmine.createSpyObj("UsersService", ["changePassword"]);
        toastSpy = jasmine.createSpyObj("ToastService", ["success", "error", "warning"]);

        await TestBed.configureTestingModule({
            imports: [PasswordSetupComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: authServiceSpy },
                { provide: UsersService, useValue: usersServiceSpy },
                { provide: ToastService, useValue: toastSpy },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
            ],
        }).compileComponents();

        router = TestBed.inject(Router);
        spyOn(router, "navigate").and.resolveTo(true);
        const fixture: ComponentFixture<PasswordSetupComponent> = TestBed.createComponent(PasswordSetupComponent);
        fixture.detectChanges();
        return { fixture, component: fixture.componentInstance };
    }

    describe("from an emailed link", () => {
        it("removes the token from the address bar and history straight away", async () => {
            await create({ token: "secret-token" });
            expect(router.navigate).toHaveBeenCalledWith(
                [],
                jasmine.objectContaining({ queryParams: {}, replaceUrl: true }),
            );
        });

        it("requires matching passwords of at least 6 characters", async () => {
            const { component } = await create({ token: "t" });
            component.form.setValue({ newPassword: "abc", confirmPassword: "abc" });
            expect(component.form.valid).toBeFalse();
            component.form.setValue({ newPassword: "abcdef", confirmPassword: "abcdeg" });
            expect(component.form.valid).toBeFalse();
            component.form.setValue({ newPassword: "abcdef", confirmPassword: "abcdef" });
            expect(component.form.valid).toBeTrue();
        });

        it("sets the password with the in-memory token and goes to sign in", async () => {
            const { component } = await create({ token: "secret-token" });
            authServiceSpy.setupPassword.and.returnValue(of({ success: true, data: { message: "ok" } }));
            component.form.setValue({ newPassword: "abcdef", confirmPassword: "abcdef" });

            component.submit();

            expect(authServiceSpy.setupPassword).toHaveBeenCalledWith("secret-token", "abcdef");
            expect(toastSpy.success).toHaveBeenCalled();
            expect(router.navigate).toHaveBeenCalledWith(["/login"]);
        });

        for (const [code, message] of [
            ["expired", "This link has expired. Request a new one."],
            ["used", "This link has already been used. Request a new one if you still need it."],
            ["invalid", "This link is not valid. Request a new one."],
        ]) {
            it(`shows the ${code} message and offers a new link`, async () => {
                const { fixture, component } = await create({ token: "t" });
                authServiceSpy.setupPassword.and.returnValue(of({ success: false, message, error: { code } }));
                component.form.setValue({ newPassword: "abcdef", confirmPassword: "abcdef" });

                component.submit();
                fixture.detectChanges();

                const el = fixture.nativeElement as HTMLElement;
                expect(el.textContent).toContain(message);
                expect(el.querySelector('a[href="/forgot-password"]')).not.toBeNull();
                expect(el.querySelector("form")).toBeNull();
            });
        }

        it("keeps the form when the server only rejects the password", async () => {
            const { fixture, component } = await create({ token: "t" });
            authServiceSpy.setupPassword.and.returnValue(
                of({
                    success: false,
                    message: "Password must be at least 6 characters.",
                    error: { code: "weak_password" },
                }),
            );
            component.form.setValue({ newPassword: "abcdef", confirmPassword: "abcdef" });

            component.submit();
            fixture.detectChanges();

            expect(component.mode()).toBe("link");
            expect(component.errorMessage()).toBe("Password must be at least 6 characters.");
        });
    });

    describe("without a token", () => {
        it("is a dead end that points to forgot password when signed out", async () => {
            const { fixture, component } = await create({});
            expect(component.mode()).toBe("dead");
            expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/forgot-password"]')).not.toBeNull();
        });
    });

    describe("forced change after a temporary password", () => {
        it("asks for the temporary password, changes it and signs the user out", async () => {
            const { component } = await create({}, true);
            expect(component.mode()).toBe("forced");
            expect(component.form.get("currentPassword")).not.toBeNull();

            usersServiceSpy.changePassword.and.returnValue(of({ success: true }) as never);
            component.form.setValue({ currentPassword: "Tmp#Pass", newPassword: "abcdef", confirmPassword: "abcdef" });
            component.submit();

            expect(usersServiceSpy.changePassword).toHaveBeenCalledWith("user-1", {
                currentPassword: "Tmp#Pass",
                newPassword: "abcdef",
            });
            expect(authServiceSpy.logout).toHaveBeenCalled();
        });

        it("shows the server message and stays when the temporary password is wrong", async () => {
            const { component } = await create({}, true);
            usersServiceSpy.changePassword.and.returnValue(
                throwError(() => ({ error: { message: "Wrong password" } })) as never,
            );
            component.form.setValue({ currentPassword: "nope", newPassword: "abcdef", confirmPassword: "abcdef" });

            component.submit();

            expect(component.errorMessage()).toBe("Wrong password");
            expect(authServiceSpy.logout).not.toHaveBeenCalled();
        });
    });
});
