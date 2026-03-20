import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { UsersService } from "../../../core/services/users.service";
import { ToastService } from "../../../core/services/toast.service";
import {
    ProfileEditDialogData,
    ProfileEditDialogResult,
    ProfileEditDialogPayload,
} from "../../../core/interfaces/profile.interface";

@Component({
    selector: "app-profile-edit-dialog",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
    ],
    templateUrl: "./profile-edit-dialog.component.html",
    styleUrls: ["./profile-edit-dialog.component.scss"],
})
export class ProfileEditDialogComponent {
    private fb = inject(FormBuilder);
    private usersService = inject(UsersService);
    private toast = inject(ToastService);
    private dialogRef = inject(MatDialogRef<ProfileEditDialogComponent, ProfileEditDialogResult>);
    data = inject<ProfileEditDialogData>(MAT_DIALOG_DATA);

    loading = false;

    profileForm: FormGroup = this.fb.group({
        name: [this.data.name, [Validators.required, Validators.minLength(2)]],
        email: [this.data.email, [Validators.required, Validators.email]],
    });

    onSubmit(): void {
        if (this.profileForm.invalid) {
            this.profileForm.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.dialogRef.disableClose = true;
        const payload = this.profileForm.value as ProfileEditDialogPayload;

        this.usersService.updateUser(this.data.userId, payload).subscribe({
            next: response => {
                if (!response.success || !response.data?.user) {
                    this.toast.error(response.message || "Failed to update profile");
                    this.loading = false;
                    this.dialogRef.disableClose = false;
                    return;
                }

                this.dialogRef.close({
                    payload,
                    updatedUser: response.data.user,
                });
            },
            error: error => {
                this.toast.error(error.error?.error || "Failed to update profile");
                this.loading = false;
                this.dialogRef.disableClose = false;
            },
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
