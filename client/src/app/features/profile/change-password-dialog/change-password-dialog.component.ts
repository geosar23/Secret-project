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
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { ChangePasswordDialogResult } from "../../../core/interfaces/change-password-dialog.interface";

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
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatIconModule,
    ],
    templateUrl: "./change-password-dialog.component.html",
    styleUrls: ["./change-password-dialog.component.scss"],
})
export class ChangePasswordDialogComponent {
    private fb = inject(FormBuilder);
    private dialogRef = inject(MatDialogRef<ChangePasswordDialogComponent, ChangePasswordDialogResult>);

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

        const { currentPassword, newPassword } = this.passwordForm.value;
        this.dialogRef.close({ currentPassword, newPassword });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
