import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of } from "rxjs";
import { CreateUserPageComponent } from "./create-user.component";
import { UsersService } from "../../../core/services/users.service";
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

describe("CreateUserPageComponent", () => {
    let fixture: ComponentFixture<CreateUserPageComponent>;
    let component: CreateUserPageComponent;

    beforeEach(async () => {
        const usersServiceSpy = jasmine.createSpyObj("UsersService", ["getUsers", "createUser"]);
        const countryServiceSpy = jasmine.createSpyObj("CountryService", ["getCountries"]);
        const employmentTitleServiceSpy = jasmine.createSpyObj("EmploymentTitleService", ["getEmploymentTitles"]);
        const roleServiceSpy = jasmine.createSpyObj("RoleService", ["getRoles"]);
        const toastSpy = jasmine.createSpyObj("ToastService", ["error", "success", "warning"]);
        const authServiceSpy = jasmine.createSpyObj("AuthService", ["getLocalUser", "isAuthenticated"], {
            localUser$: of(null),
        });

        countryServiceSpy.getCountries.and.returnValue(of({ success: true, data: [] }));
        employmentTitleServiceSpy.getEmploymentTitles.and.returnValue(of({ success: true, data: [] }));
        roleServiceSpy.getRoles.and.returnValue(of({ success: true, data: [] }));
        usersServiceSpy.getUsers.and.returnValue(of({ success: true, data: { users: [], total: 0 } }));
        authServiceSpy.getLocalUser.and.returnValue(mockLocalUser);

        await TestBed.configureTestingModule({
            imports: [CreateUserPageComponent],
            providers: [
                provideRouter([]),
                { provide: UsersService, useValue: usersServiceSpy },
                { provide: CountryService, useValue: countryServiceSpy },
                { provide: EmploymentTitleService, useValue: employmentTitleServiceSpy },
                { provide: RoleService, useValue: roleServiceSpy },
                { provide: ToastService, useValue: toastSpy },
                { provide: AuthService, useValue: authServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CreateUserPageComponent);
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
        component.userForm.patchValue({
            name: "John Doe",
            email: "john@test.com",
            password: "secret123",
            role: "507f1f77bcf86cd799439011",
            countryId: "507f1f77bcf86cd799439013",
            employmentTitleId: "507f1f77bcf86cd799439014",
        });
        expect(component.userForm.valid).toBeTrue();
    });
});
