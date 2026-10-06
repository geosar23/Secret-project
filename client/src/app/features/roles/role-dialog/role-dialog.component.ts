import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { RoleService } from "../../../core/services/role.service";
import { AuthService } from "../../../core/services/auth.service";
import { ToastService } from "../../../core/services/toast.service";
import { IRole } from "../../../core/interfaces/role.interface";
import { PermissionSelectorComponent } from "../../../shared/components/permission-selector/permission-selector.component";

export interface RoleDialogData {
    mode: "create" | "edit";
    role?: IRole;
}

@Component({
    selector: "app-role-dialog",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatSlideToggleModule,
        PermissionSelectorComponent,
    ],
    templateUrl: "./role-dialog.component.html",
    styleUrls: ["./role-dialog.component.scss"],
})
export class RoleDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private roleService = inject(RoleService);
    private authService = inject(AuthService);
    private toast = inject(ToastService);
    private dialogRef = inject(MatDialogRef<RoleDialogComponent, IRole | undefined>);
    data = inject<RoleDialogData>(MAT_DIALOG_DATA);

    loading = false;
    isEdit = this.data.mode === "edit";
    isSystemRole = this.data.role?.isSystemRole ?? false;

    form: FormGroup = this.fb.group({
        name: [this.data.role?.name ?? "", [Validators.required, Validators.minLength(2)]],
        description: [this.data.role?.description ?? "", [Validators.maxLength(255)]],
        level: [
            this.data.role?.level ?? 55,
            [Validators.required, Validators.min(1), Validators.max(100), Validators.pattern(/^\d+$/)],
        ],
        isActive: [this.data.role?.isActive ?? true],
        permissions: [this.data.role?.permissions ?? []],
    });

    ngOnInit(): void {
        if (this.isEdit && this.isSystemRole) {
            this.form.get("name")?.disable();
            this.form.get("level")?.disable();
        }
    }

    get selectedPermissions(): string[] {
        return (this.form.get("permissions")?.value as string[]) ?? [];
    }

    onPermissionsChange(permissions: string[]): void {
        this.form.get("permissions")?.setValue(permissions);
        this.form.get("permissions")?.markAsDirty();
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.dialogRef.disableClose = true;

        const { name, description, level, isActive, permissions } = this.form.value as {
            name: string;
            description: string;
            level?: number;
            isActive: boolean;
            permissions: string[];
        };

        const request$ = this.isEdit
            ? this.roleService.updateRole(this.data.role!._id as string, {
                  name,
                  description,
                  level,
                  isActive,
                  permissions,
              })
            : this.roleService.createRole({
                  name,
                  description,
                  level,
                  permissions,
              });

        request$.subscribe({
            next: res => {
                if (!res.success || !res.data?.role) {
                    this.toast.error(res.message || "Operation failed");
                    this.loading = false;
                    this.dialogRef.disableClose = false;
                    return;
                }
                this.dialogRef.close(res.data.role);
            },
            error: err => {
                this.toast.error(err.error?.message || "Operation failed");
                this.loading = false;
                this.dialogRef.disableClose = false;
            },
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
