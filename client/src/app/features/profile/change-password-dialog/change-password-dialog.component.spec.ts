import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { of, throwError } from "rxjs";
import { ChangePasswordDialogComponent } from "./change-password-dialog.component";
import { UsersService } from "../../../core/services/users.service";
import { ToastService } from "../../../core/services/toast.service";

describe("ChangePasswordDialogComponent", () => {
    let fixture: ComponentFixture<ChangePasswordDialogComponent>;
    let component: ChangePasswordDialogComponent;
    let usersServiceSpy: jasmine.SpyObj<UsersService>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ChangePasswordDialogComponent, boolean>>;
    let toastSpy: jasmine.SpyObj<ToastService>;

    beforeEach(async () => {
        usersServiceSpy = jasmine.createSpyObj("UsersService", ["changePassword"]);
        dialogRefSpy = jasmine.createSpyObj("MatDialogRef", ["close"]);
        toastSpy = jasmine.createSpyObj("ToastService", ["error", "success", "warning"]);

        await TestBed.configureTestingModule({
            imports: [ChangePasswordDialogComponent],
            providers: [
                { provide: UsersService, useValue: usersServiceSpy },
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: ToastService, useValue: toastSpy },
                { provide: MAT_DIALOG_DATA, useValue: { userId: "test-user-id" } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ChangePasswordDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    // ─── Form validation ──────────────────────────────────────────────────────

    it("creates the component with an invalid empty form", () => {
        expect(component).toBeTruthy();
        expect(component.passwordForm.valid).toBeFalse();
    });

    it("marks currentPassword invalid when empty", () => {
        component.passwordForm.patchValue({ currentPassword: "" });
        expect(component.passwordForm.get("currentPassword")?.valid).toBeFalse();
    });

    it("marks newPassword invalid when shorter than 6 characters", () => {
        component.passwordForm.patchValue({ newPassword: "abc" });
        expect(component.passwordForm.get("newPassword")?.valid).toBeFalse();
    });

    it("marks confirmPassword invalid when empty", () => {
        component.passwordForm.patchValue({ confirmPassword: "" });
        expect(component.passwordForm.get("confirmPassword")?.valid).toBeFalse();
    });

    // ─── Password-match validator ─────────────────────────────────────────────

    it("sets passwordMismatch error on confirmPassword when passwords differ", () => {
        component.passwordForm.setValue({
            currentPassword: "oldpass",
            newPassword: "newpass1",
            confirmPassword: "different",
        });
        const confirmCtrl = component.passwordForm.get("confirmPassword");
        expect(confirmCtrl?.hasError("passwordMismatch")).toBeTrue();
    });

    it("clears passwordMismatch error when passwords match", () => {
        component.passwordForm.setValue({
            currentPassword: "oldpass",
            newPassword: "newpass1",
            confirmPassword: "newpass1",
        });
        const confirmCtrl = component.passwordForm.get("confirmPassword");
        expect(confirmCtrl?.hasError("passwordMismatch")).toBeFalse();
    });

    // ─── hasPasswordMismatch() ────────────────────────────────────────────────

    it("hasPasswordMismatch() returns false when confirmPassword is not touched", () => {
        component.passwordForm.setValue({
            currentPassword: "oldpass",
            newPassword: "newpass1",
            confirmPassword: "different",
        });
        // confirmPassword not yet touched
        expect(component.hasPasswordMismatch()).toBeFalse();
    });

    it("hasPasswordMismatch() returns true when confirmPassword is touched and mismatched", () => {
        component.passwordForm.setValue({
            currentPassword: "oldpass",
            newPassword: "newpass1",
            confirmPassword: "different",
        });
        component.passwordForm.get("confirmPassword")?.markAsTouched();
        expect(component.hasPasswordMismatch()).toBeTrue();
    });

    // ─── onSubmit() ──────────────────────────────────────────────────────────

    it("marks form as touched and does not call changePassword when form is invalid", () => {
        component.onSubmit();
        expect(usersServiceSpy.changePassword).not.toHaveBeenCalled();
        expect(component.passwordForm.touched).toBeTrue();
    });

    it("calls changePassword and closes dialog on success", () => {
        usersServiceSpy.changePassword.and.returnValue(of({ success: true, message: "ok", data: undefined }) as never);
        component.passwordForm.setValue({
            currentPassword: "oldpass",
            newPassword: "newpass1",
            confirmPassword: "newpass1",
        });

        component.onSubmit();

        expect(usersServiceSpy.changePassword).toHaveBeenCalledWith("test-user-id", {
            currentPassword: "oldpass",
            newPassword: "newpass1",
        });
        expect(toastSpy.success).toHaveBeenCalledWith("Password changed successfully");
        expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
    });

    it("shows toast error and stops loading on changePassword failure", () => {
        usersServiceSpy.changePassword.and.returnValue(
            throwError(() => ({ error: { error: "Wrong current password" } })) as never,
        );
        component.passwordForm.setValue({
            currentPassword: "wrongpass",
            newPassword: "newpass1",
            confirmPassword: "newpass1",
        });

        component.onSubmit();

        expect(toastSpy.error).toHaveBeenCalledWith("Wrong current password");
        expect(component.loading).toBeFalse();
    });
});
