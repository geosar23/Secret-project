import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

export interface ProfileEditDialogData {
    name: string;
    email: string;
}

export interface ProfileEditDialogResult {
    name: string;
    email: string;
}

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
        this.dialogRef.close(this.profileForm.value as ProfileEditDialogResult);
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
