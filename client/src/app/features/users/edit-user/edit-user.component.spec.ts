import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ActivatedRoute } from "@angular/router";
import { provideRouter } from "@angular/router";
import { of } from "rxjs";
import { EditUserPageComponent } from "./edit-user.component";
import { UsersService } from "../../../core/services/users.service";
import { CountryService } from "../../../core/services/country.service";
import { EmploymentTitleService } from "../../../core/services/employment-title.service";
import { RoleService } from "../../../core/services/role.service";
import { DepartmentService } from "../../../core/services/department.service";
import { LevelService } from "../../../core/services/level.service";
import { OfficeService } from "../../../core/services/office.service";
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

describe("EditUserPageComponent", () => {
    let fixture: ComponentFixture<EditUserPageComponent>;
    let component: EditUserPageComponent;
    let usersServiceSpy: jasmine.SpyObj<UsersService>;

    beforeEach(async () => {
        usersServiceSpy = jasmine.createSpyObj("UsersService", [
            "getUsers",
            "getUserById",
            "updateUser",
            "getProfileImageUrl",
        ]);
        const countryServiceSpy = jasmine.createSpyObj("CountryService", ["getCountries"]);
        const employmentTitleServiceSpy = jasmine.createSpyObj("EmploymentTitleService", ["getEmploymentTitles"]);
        const roleServiceSpy = jasmine.createSpyObj("RoleService", ["getAllRoles"]);
        const departmentServiceSpy = jasmine.createSpyObj("DepartmentService", ["getDepartments"]);
        const levelServiceSpy = jasmine.createSpyObj("LevelService", ["getLevels"]);
        const officeServiceSpy = jasmine.createSpyObj("OfficeService", ["getOffices"]);
        const toastSpy = jasmine.createSpyObj("ToastService", ["error", "success", "warning", "info"]);
        const authServiceSpy = jasmine.createSpyObj("AuthService", ["getLocalUser", "isAuthenticated"], {
            localUser$: of(null),
        });

        usersServiceSpy.getUserById.and.returnValue(of({ success: true, data: mockUser }) as never);
        usersServiceSpy.getUsers.and.returnValue(of({ success: true, data: { users: [], total: 0 } }) as never);
        countryServiceSpy.getCountries.and.returnValue(of({ success: true, data: [] }));
        employmentTitleServiceSpy.getEmploymentTitles.and.returnValue(of({ success: true, data: [] }));
        roleServiceSpy.getAllRoles.and.returnValue(of({ success: true, data: [] }));
        departmentServiceSpy.getDepartments.and.returnValue(of({ success: true, data: [] }));
        levelServiceSpy.getLevels.and.returnValue(of({ success: true, data: [] }));
        officeServiceSpy.getOffices.and.returnValue(of({ success: true, data: [] }));
        authServiceSpy.getLocalUser.and.returnValue(mockLocalUser);

        await TestBed.configureTestingModule({
            imports: [EditUserPageComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: { paramMap: { get: () => "user-123" } },
                    },
                },
                { provide: UsersService, useValue: usersServiceSpy },
                { provide: CountryService, useValue: countryServiceSpy },
                { provide: EmploymentTitleService, useValue: employmentTitleServiceSpy },
                { provide: RoleService, useValue: roleServiceSpy },
                { provide: DepartmentService, useValue: departmentServiceSpy },
                { provide: LevelService, useValue: levelServiceSpy },
                { provide: OfficeService, useValue: officeServiceSpy },
                { provide: ToastService, useValue: toastSpy },
                { provide: AuthService, useValue: authServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EditUserPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("creates the component", () => {
        expect(component).toBeTruthy();
    });

    it("fetches the user on init", () => {
        expect(usersServiceSpy.getUserById).toHaveBeenCalledWith("user-123");
    });

    it("patches the form with loaded user data", async () => {
        await fixture.whenStable();
        fixture.detectChanges();
        expect(component.userForm.get("name")?.value).toBe("Jane Doe");
        expect(component.userForm.get("email")?.value).toBe("jane@test.com");
    });

    it("marks name invalid when cleared", () => {
        component.userForm.patchValue({ name: "" });
        expect(component.userForm.get("name")?.valid).toBeFalse();
    });

    it("marks email invalid with a bad address", () => {
        component.userForm.patchValue({ email: "not-an-email" });
        expect(component.userForm.get("email")?.valid).toBeFalse();
    });
});
