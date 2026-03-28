import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
    AbstractControl,
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ChangePasswordDialogData } from "../../../core/interfaces/profile.interface";
import { UsersService } from "../../../core/services/users.service";
import { PasswordInputComponent } from "../../../shared/components/password-input/password-input.component";
import { ToastService } from "../../../core/services/toast.service";
import { JsonResponse } from "../../../core/interfaces/generics.interface";

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get("newPassword")?.value;
    const confirmPassword = control.get("confirmPassword")?.value;
    return newPassword && confirmPassword && newPassword !== confirmPassword ? { passwordMismatch: true } : null;
}

@Component({
    selector: "app-change-password-dialog",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        PasswordInputComponent,
    ],
    templateUrl: "./change-password-dialog.component.html",
    styleUrls: ["./change-password-dialog.component.scss"],
})
export class ChangePasswordDialogComponent {
    private fb = inject(FormBuilder);
    private usersService = inject(UsersService);
    private toast = inject(ToastService);
    private dialogRef = inject(MatDialogRef<ChangePasswordDialogComponent, boolean>);
    data = inject<ChangePasswordDialogData>(MAT_DIALOG_DATA);

    loading = false;

    passwordForm: FormGroup = this.fb.group(
        {
            currentPassword: ["", [Validators.required]],
            newPassword: ["", [Validators.required, Validators.minLength(6)]],
            confirmPassword: ["", [Validators.required]],
        },
        { validators: passwordMatchValidator },
    );

    onSubmit(): void {
        if (this.passwordForm.invalid) {
            this.passwordForm.markAllAsTouched();
            return;
        }

        if (!this.data?.userId) {
            this.toast.error("User profile is not loaded");
            return;
        }

        const { currentPassword, newPassword } = this.passwordForm.value;
        this.loading = true;
        this.usersService.changePassword(this.data.userId, { currentPassword, newPassword }).subscribe({
            next: (response: JsonResponse<void>) => {
                if (!response.success) {
                    this.toast.warning(response.message || "Failed to change password");
                    this.loading = false;
                    return;
                }
                this.toast.success("Password changed successfully");
                this.dialogRef.close(true);
            },
            error: error => {
                this.toast.error(error.error?.error || "Failed to change password");
                this.loading = false;
            },
            complete: () => {
                this.loading = false;
            },
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    hasPasswordMismatch(): boolean {
        const confirmPassword = this.passwordForm.get("confirmPassword");
        const newPassword = this.passwordForm.get("newPassword");
        return (
            !!this.passwordForm.hasError("passwordMismatch") &&
            !!confirmPassword &&
            !!newPassword &&
            (confirmPassword.touched || confirmPassword.dirty || newPassword.touched || newPassword.dirty)
        );
    }
}
