import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, throwError } from "rxjs";
import { ForgotPasswordComponent } from "./forgot-password.component";
import { AuthService } from "../../../core/services/auth.service";

describe("ForgotPasswordComponent", () => {
    let fixture: ComponentFixture<ForgotPasswordComponent>;
    let component: ForgotPasswordComponent;
    let authServiceSpy: jasmine.SpyObj<AuthService>;

    const el = () => fixture.nativeElement as HTMLElement;

    beforeEach(async () => {
        authServiceSpy = jasmine.createSpyObj("AuthService", ["forgotPassword"]);

        await TestBed.configureTestingModule({
            imports: [ForgotPasswordComponent],
            providers: [provideRouter([]), { provide: AuthService, useValue: authServiceSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(ForgotPasswordComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("starts with an invalid form and links back to sign in", () => {
        expect(component.form.valid).toBeFalse();
        expect(el().querySelector('a[href="/login"]')).not.toBeNull();
    });

    it("rejects an empty or malformed email without calling the server", () => {
        component.submit();
        component.form.setValue({ email: "not-an-email" });
        component.submit();
        expect(authServiceSpy.forgotPassword).not.toHaveBeenCalled();
    });

    it("sends the email and shows the generic confirmation", () => {
        authServiceSpy.forgotPassword.and.returnValue(of({ success: true, data: { message: "x" } }));
        component.form.setValue({ email: "user@test.com" });

        component.submit();
        fixture.detectChanges();

        expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith("user@test.com");
        expect(el().textContent).toContain("If an account exists for that email");
        expect(el().querySelector("form")).toBeNull();
    });

    it("keeps the form so the user can retry after a failure", () => {
        authServiceSpy.forgotPassword.and.returnValue(throwError(() => ({ status: 429 })));
        component.form.setValue({ email: "user@test.com" });

        component.submit();
        fixture.detectChanges();

        expect(component.submitted()).toBeFalse();
        expect(component.loading()).toBeFalse();
        expect(el().querySelector("form")).not.toBeNull();
    });
});
