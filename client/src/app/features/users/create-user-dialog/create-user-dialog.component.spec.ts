import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatDialogRef } from "@angular/material/dialog";
import { of } from "rxjs";
import { CreateUserDialogComponent } from "./create-user-dialog.component";
import { UsersService } from "../../../core/services/users.service";
import { CompanyService } from "../../../core/services/company.service";
import { CountryService } from "../../../core/services/country.service";
import { EmploymentTitleService } from "../../../core/services/employment-title.service";
import { RoleService } from "../../../core/services/role.service";
import { ToastService } from "../../../core/services/toast.service";
import { AuthService } from "../../../core/services/auth.service";
import { UserRole } from "../../../core/enums/user-role.enum";

const mockLocalUser = {
    _id: "user-id",
    name: "Admin",
    email: "admin@test.com",
    role: { _id: "role-id", role: UserRole.ADMIN, name: "Admin" },
    company: { _id: "company-id", name: "Test Company" },
};

describe("CreateUserDialogComponent", () => {
    let fixture: ComponentFixture<CreateUserDialogComponent>;
    let component: CreateUserDialogComponent;

    beforeEach(async () => {
        const usersServiceSpy = jasmine.createSpyObj("UsersService", ["getUsers", "createUser"]);
        const companyServiceSpy = jasmine.createSpyObj("CompanyService", ["getCompanies"]);
        const countryServiceSpy = jasmine.createSpyObj("CountryService", ["getCountries"]);
        const employmentTitleServiceSpy = jasmine.createSpyObj("EmploymentTitleService", ["getEmploymentTitles"]);
        const roleServiceSpy = jasmine.createSpyObj("RoleService", ["getRoles"]);
        const dialogRefSpy = jasmine.createSpyObj("MatDialogRef", ["close"]);
        const toastSpy = jasmine.createSpyObj("ToastService", ["error", "success", "warning"]);
        const authServiceSpy = jasmine.createSpyObj("AuthService", ["getLocalUser", "isAuthenticated"]);

        // Return empty arrays for all list calls so ngOnInit doesn't throw
        companyServiceSpy.getCompanies.and.returnValue(of({ success: true, data: [] }));
        countryServiceSpy.getCountries.and.returnValue(of({ success: true, data: [] }));
        employmentTitleServiceSpy.getEmploymentTitles.and.returnValue(of({ success: true, data: [] }));
        roleServiceSpy.getRoles.and.returnValue(of({ success: true, data: [] }));
        usersServiceSpy.getUsers.and.returnValue(of({ success: true, data: [] }));
        authServiceSpy.getLocalUser.and.returnValue(mockLocalUser);

        await TestBed.configureTestingModule({
            imports: [CreateUserDialogComponent],
            providers: [
                { provide: UsersService, useValue: usersServiceSpy },
                { provide: CompanyService, useValue: companyServiceSpy },
                { provide: CountryService, useValue: countryServiceSpy },
                { provide: EmploymentTitleService, useValue: employmentTitleServiceSpy },
                { provide: RoleService, useValue: roleServiceSpy },
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: ToastService, useValue: toastSpy },
                { provide: AuthService, useValue: authServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CreateUserDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    // ─── Form validation ──────────────────────────────────────────────────────

    it("creates the component with an invalid empty form", () => {
        expect(component).toBeTruthy();
        expect(component.userForm.valid).toBeFalse();
    });

    it("marks name invalid when empty", () => {
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

    it("marks password invalid when shorter than 6 characters", () => {
        component.userForm.patchValue({ password: "abc" });
        expect(component.userForm.get("password")?.valid).toBeFalse();
    });

    it("marks role invalid when empty", () => {
        component.userForm.patchValue({ role: "" });
        expect(component.userForm.get("role")?.valid).toBeFalse();
    });

    it("marks form valid when all required fields are filled correctly", () => {
        component.userForm.setValue({
            name: "John Doe",
            email: "john@test.com",
            password: "secret123",
            role: "role-id",
            companyId: "company-id",
            countryId: "country-id",
            employmentTitleId: "title-id",
            managerId: "manager-id",
        });
        expect(component.userForm.valid).toBeTrue();
    });
});
