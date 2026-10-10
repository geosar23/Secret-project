import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { ChangePasswordDialogData } from "../../../core/interfaces/profile.interface";
import { UsersService } from "../../../core/services/users.service";
import { ToastService } from "../../../core/services/toast.service";
import { JsonResponse } from "../../../core/interfaces/generics.interface";
import { LoadingButtonComponent } from "../../../shared/components/loading-button/loading-button.component";

@Component({
    selector: "app-reset-password-dialog",
    standalone: true,
    imports: [MatDialogModule, MatButtonModule, LoadingButtonComponent],
    templateUrl: "./reset-password-dialog.component.html",
    styleUrls: ["./reset-password-dialog.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordDialogComponent {
    private usersService = inject(UsersService);
    private toast = inject(ToastService);
    private dialogRef = inject(MatDialogRef<ResetPasswordDialogComponent, boolean>);
    data = inject<ChangePasswordDialogData>(MAT_DIALOG_DATA);

    loading = signal(false);

    onSubmit(): void {
        if (!this.data?.userId) {
            this.toast.error("User ID is missing");
            return;
        }

        this.loading.set(true);
        this.usersService.resetPasswordForUser(this.data.userId).subscribe({
            next: (response: JsonResponse<void>) => {
                this.loading.set(false);
                if (!response.success) {
                    this.toast.warning(response.message || "Failed to reset password");
                    return;
                }
                this.toast.success("A temporary password was emailed to the user");
                this.dialogRef.close(true);
            },
            error: error => {
                this.loading.set(false);
                this.toast.error(error.error?.message || "Failed to reset password");
            },
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
