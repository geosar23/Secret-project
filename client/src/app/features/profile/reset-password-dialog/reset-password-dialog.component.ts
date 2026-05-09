import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ChangePasswordDialogData } from "../../../core/interfaces/profile.interface";
import { UsersService } from "../../../core/services/users.service";
import { PasswordInputComponent } from "../../../shared/components/password-input/password-input.component";
import { ToastService } from "../../../core/services/toast.service";
import { JsonResponse } from "../../../core/interfaces/generics.interface";
import { passwordMatchValidator } from "../../../core/validators/generic.validators";

@Component({
    selector: "app-reset-password-dialog",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        PasswordInputComponent,
    ],
    templateUrl: "./reset-password-dialog.component.html",
    styleUrls: ["./reset-password-dialog.component.scss"],
})
export class ResetPasswordDialogComponent {
    private fb = inject(FormBuilder);
    private usersService = inject(UsersService);
    private toast = inject(ToastService);
    private dialogRef = inject(MatDialogRef<ResetPasswordDialogComponent, boolean>);
    data = inject<ChangePasswordDialogData>(MAT_DIALOG_DATA);

    loading = false;

    passwordForm: FormGroup = this.fb.group(
        {
            newPassword: ["", [Validators.required, Validators.minLength(6)]],
            confirmPassword: ["", [Validators.required]],
        },
        { validators: passwordMatchValidator },
    );

    hasPasswordMismatch(): boolean {
        const confirmPassword = this.passwordForm.get("confirmPassword");
        return !!confirmPassword?.touched && !!confirmPassword?.hasError("passwordMismatch");
    }

    onSubmit(): void {
        if (this.passwordForm.invalid) {
            this.passwordForm.markAllAsTouched();
            return;
        }

        if (!this.data?.userId) {
            this.toast.error("User ID is missing");
            return;
        }

        const { newPassword } = this.passwordForm.value;
        this.loading = true;
        this.usersService.resetPasswordForUser(this.data.userId, newPassword).subscribe({
            next: (response: JsonResponse<void>) => {
                if (!response.success) {
                    this.toast.warning(response.message || "Failed to reset password");
                    this.loading = false;
                    return;
                }
                this.toast.success("Password reset successfully");
                this.dialogRef.close(true);
            },
            error: error => {
                this.toast.error(error.error?.error || "Failed to reset password");
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
}
