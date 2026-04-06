import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { of, throwError } from "rxjs";
import { LoginComponent } from "./login.component";
import { AuthService } from "../../../core/services/auth.service";
import { ToastService } from "../../../core/services/toast.service";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";

describe("LoginComponent", () => {
    let fixture: ComponentFixture<LoginComponent>;
    let component: LoginComponent;
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let toastSpy: jasmine.SpyObj<ToastService>;

    beforeEach(async () => {
        authServiceSpy = jasmine.createSpyObj("AuthService", ["login", "isAuthenticated", "getLocalUser"]);
        routerSpy = jasmine.createSpyObj("Router", ["navigate"]);
        toastSpy = jasmine.createSpyObj("ToastService", ["error", "success", "warning"]);

        authServiceSpy.isAuthenticated.and.returnValue(false);
        authServiceSpy.getLocalUser.and.returnValue(null);

        await TestBed.configureTestingModule({
            imports: [LoginComponent],
            providers: [
                provideRouter([]),
                provideAnimationsAsync(),
                { provide: AuthService, useValue: authServiceSpy },
                { provide: Router, useValue: routerSpy },
                { provide: ToastService, useValue: toastSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(LoginComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    // ─── Form validation ────────────────────────────────────────────────────

    it("creates the component with an invalid empty form", () => {
        expect(component).toBeTruthy();
        expect(component.loginForm.valid).toBeFalse();
    });

    it("marks form invalid with a bad email", () => {
        component.loginForm.setValue({ email: "not-an-email", password: "pass123" });
        expect(component.loginForm.get("email")?.valid).toBeFalse();
    });

    it("marks form invalid when password is too short", () => {
        component.loginForm.setValue({ email: "user@test.com", password: "abc" });
        expect(component.loginForm.get("password")?.valid).toBeFalse();
    });

    it("marks form valid with correct email and password", () => {
        component.loginForm.setValue({ email: "user@test.com", password: "password123" });
        expect(component.loginForm.valid).toBeTrue();
    });

    // ─── Submit behaviour ────────────────────────────────────────────────────

    it("does not call AuthService.login when form is invalid", () => {
        component.onSubmit();
        expect(authServiceSpy.login).not.toHaveBeenCalled();
    });

    it("navigates to /dashboard on successful login", () => {
        authServiceSpy.login.and.returnValue(of({ success: true, data: { token: "tok" } }) as never);
        component.loginForm.setValue({ email: "user@test.com", password: "password123" });

        component.onSubmit();

        expect(authServiceSpy.login).toHaveBeenCalledWith({ email: "user@test.com", password: "password123" });
        expect(routerSpy.navigate).toHaveBeenCalledWith(["/dashboard"]);
    });

    it("sets errorMessage and calls toast.error on login failure", () => {
        authServiceSpy.login.and.returnValue(
            throwError(() => ({ error: { message: "Invalid credentials" } })) as never,
        );
        component.loginForm.setValue({ email: "user@test.com", password: "wrongpassword" });

        component.onSubmit();

        expect(component.errorMessage).toBe("Invalid credentials");
        expect(toastSpy.error).toHaveBeenCalledWith("Invalid credentials");
    });
});
