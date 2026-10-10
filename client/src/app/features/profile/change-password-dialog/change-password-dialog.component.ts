import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ChangePasswordDialogData } from "../../../core/interfaces/profile.interface";
import { UsersService } from "../../../core/services/users.service";
import { PasswordInputComponent } from "../../../shared/components/password-input/password-input.component";
import { AuthService } from "../../../core/services/auth.service";
import { ToastService } from "../../../core/services/toast.service";
import { JsonResponse } from "../../../core/interfaces/generics.interface";
import { passwordMatchValidator } from "../../../core/validators/generic.validators";

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
    private authService = inject(AuthService);
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
                this.toast.success("Password changed. Please sign in again.");
                this.dialogRef.close(true);
                this.authService.logout(); // the change ends every session, including this one
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
}
