import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { UsersService } from "../../../core/services/users.service";
import { CompanyService } from "../../../core/services/company.service";
import { RoleService } from "../../../core/services/role.service";
import { ToastService } from "../../../core/services/toast.service";
import { IUser } from "../../../core/interfaces/user.interface";
import { ICompany } from "../../../core/interfaces/company.interface";
import { IRole } from "../../../core/interfaces/role.interface";

export interface EditUserDialogData {
    user: IUser;
}

@Component({
    selector: "app-edit-user-dialog",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatSlideToggleModule,
    ],
    templateUrl: "./edit-user-dialog.component.html",
    styleUrls: ["./edit-user-dialog.component.scss"],
})
export class EditUserDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private usersService = inject(UsersService);
    private companyService = inject(CompanyService);
    private roleService = inject(RoleService);
    private toast = inject(ToastService);
    private dialogRef = inject(MatDialogRef<EditUserDialogComponent, IUser | undefined>);
    data = inject<EditUserDialogData>(MAT_DIALOG_DATA);

    loading = false;
    companiesLoading = false;
    rolesLoading = false;
    companies: ICompany[] = [];
    roles: IRole[] = [];

    userForm: FormGroup = this.fb.group({
        name: [this.data.user.name, [Validators.required, Validators.minLength(2)]],
        email: [this.data.user.email, [Validators.required, Validators.email]],
        role: [this.data.user.role?._id ?? "", Validators.required],
        companyId: [this.data.user.company?._id ?? ""],
        isActive: [this.data.user.isActive ?? true],
    });

    ngOnInit(): void {
        this.companiesLoading = true;
        this.rolesLoading = true;

        this.companyService.getCompanies().subscribe({
            next: res => {
                this.companies = res.data ?? [];
                this.companiesLoading = false;
            },
            error: () => {
                this.companiesLoading = false;
            },
        });

        this.roleService.getAllRoles().subscribe({
            next: res => {
                this.roles = res.data ?? [];
                this.rolesLoading = false;
            },
            error: () => {
                this.rolesLoading = false;
            },
        });
    }

    onSubmit(): void {
        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.dialogRef.disableClose = true;

        const { name, email, role, companyId, isActive } = this.userForm.value;
        const payload = { name, email, role: role || undefined, companyId: companyId || undefined, isActive };

        this.usersService.updateUser(this.data.user._id as string, payload).subscribe({
            next: res => {
                if (!res.success) {
                    this.toast.error(res.message || "Failed to update user");
                    this.loading = false;
                    this.dialogRef.disableClose = false;
                    return;
                }
                // Return an updated user object merging the form changes
                const updatedUser: IUser = {
                    ...this.data.user,
                    name,
                    email,
                    isActive,
                    role: this.roles.find(r => r._id === role) ?? this.data.user.role,
                    company: this.companies.find(c => c._id === companyId) ?? this.data.user.company,
                };
                this.dialogRef.close(updatedUser);
            },
            error: err => {
                this.toast.error(err.error?.error || "Failed to update user");
                this.loading = false;
                this.dialogRef.disableClose = false;
            },
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
