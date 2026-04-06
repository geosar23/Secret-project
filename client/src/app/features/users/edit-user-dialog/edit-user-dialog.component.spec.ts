import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { of } from "rxjs";
import { EditUserDialogComponent } from "./edit-user-dialog.component";
import { UsersService } from "../../../core/services/users.service";
import { CountryService } from "../../../core/services/country.service";
import { EmploymentTitleService } from "../../../core/services/employment-title.service";
import { RoleService } from "../../../core/services/role.service";
import { ToastService } from "../../../core/services/toast.service";
import { AuthService } from "../../../core/services/auth.service";
import { UserRole } from "../../../core/enums/user-role.enum";
import { IUser } from "../../../core/interfaces/user.interface";

const mockUser: IUser = {
    _id: "user-123",
    name: "Jane Doe",
    email: "jane@test.com",
    isActive: true,
    role: { _id: "role-id", role: UserRole.ADMIN, name: "Admin" },
    company: { _id: "company-id", name: "Test Company" },
    country: { _id: "country-id", name: "Greece" },
    employmentTitle: { _id: "title-id", title: "Engineer" },
    manager: undefined,
} as unknown as IUser;

const mockLocalUser = {
    _id: "local-user-id",
    name: "Super Admin",
    email: "super@test.com",
    role: { _id: "role-id", role: UserRole.ADMIN, name: "Admin" },
    company: { _id: "company-id", name: "Test Company" },
};

describe("EditUserDialogComponent", () => {
    let fixture: ComponentFixture<EditUserDialogComponent>;
    let component: EditUserDialogComponent;
    let usersServiceSpy: jasmine.SpyObj<UsersService>;

    beforeEach(async () => {
        usersServiceSpy = jasmine.createSpyObj("UsersService", ["getUsers", "updateUser"]);
        const countryServiceSpy = jasmine.createSpyObj("CountryService", ["getCountries"]);
        const employmentTitleServiceSpy = jasmine.createSpyObj("EmploymentTitleService", ["getEmploymentTitles"]);
        const roleServiceSpy = jasmine.createSpyObj("RoleService", ["getAllRoles"]);
        const dialogRefSpy = jasmine.createSpyObj("MatDialogRef", ["close"]);
        const toastSpy = jasmine.createSpyObj("ToastService", ["error", "success", "warning", "info"]);
        const authServiceSpy = jasmine.createSpyObj("AuthService", ["getLocalUser", "isAuthenticated"]);

        usersServiceSpy.getUsers.and.returnValue(of({ success: true, data: { users: [], total: 0 } }) as never);
        countryServiceSpy.getCountries.and.returnValue(of({ success: true, data: [] }));
        employmentTitleServiceSpy.getEmploymentTitles.and.returnValue(of({ success: true, data: [] }));
        roleServiceSpy.getAllRoles.and.returnValue(of({ success: true, data: [] }));
        authServiceSpy.getLocalUser.and.returnValue(mockLocalUser);

        await TestBed.configureTestingModule({
            imports: [EditUserDialogComponent],
            providers: [
                { provide: UsersService, useValue: usersServiceSpy },
                { provide: CountryService, useValue: countryServiceSpy },
                { provide: EmploymentTitleService, useValue: employmentTitleServiceSpy },
                { provide: RoleService, useValue: roleServiceSpy },
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: ToastService, useValue: toastSpy },
                { provide: AuthService, useValue: authServiceSpy },
                { provide: MAT_DIALOG_DATA, useValue: { user: mockUser } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EditUserDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    // ─── Initialisation ───────────────────────────────────────────────────────

    it("creates the component", () => {
        expect(component).toBeTruthy();
    });

    it("pre-populates the form with the supplied user data", () => {
        expect(component.userForm.get("name")?.value).toBe(mockUser.name);
        expect(component.userForm.get("email")?.value).toBe(mockUser.email);
        expect(component.userForm.get("role")?.value).toBe(mockUser.role._id);
    });

    // ─── Form validation ──────────────────────────────────────────────────────

    it("marks form valid with all required fields filled", () => {
        expect(component.userForm.valid).toBeTrue();
    });

    it("marks name invalid when cleared", () => {
        component.userForm.patchValue({ name: "" });
        expect(component.userForm.get("name")?.valid).toBeFalse();
    });

    it("marks name invalid when too short", () => {
        component.userForm.patchValue({ name: "A" });
        expect(component.userForm.get("name")?.valid).toBeFalse();
    });

    it("marks email invalid with a bad address", () => {
        component.userForm.patchValue({ email: "not-an-email" });
        expect(component.userForm.get("email")?.valid).toBeFalse();
    });

    it("marks role invalid when cleared", () => {
        component.userForm.patchValue({ role: "" });
        expect(component.userForm.get("role")?.valid).toBeFalse();
    });

    // ─── onSubmit guard ───────────────────────────────────────────────────────

    it("marks form as touched and does not call updateUser when form is invalid", async () => {
        component.userForm.patchValue({ name: "" });
        await component.onSubmit();
        expect(usersServiceSpy.updateUser).not.toHaveBeenCalled();
        expect(component.userForm.touched).toBeTrue();
    });
});
