import {
    keepSecondarySubDepartments,
    officesIn,
    peopleIn,
    refId,
    secondaryDepartmentsOf,
    secondarySubDepartmentsOf,
    selectable,
    subDepartmentsOf,
    titlesOf,
} from "./user-form-options";
import { IDepartment } from "../interfaces/department.interface";
import { IUser, IOffice } from "../interfaces/user.interface";
import { ISubDepartment } from "../interfaces/sub-department.interface";
import { IEmploymentTitle } from "../interfaces/employment-title.interface";

const sub = (id: string, departmentId: string, isActive = true) =>
    ({ _id: id, name: id, department: { _id: departmentId }, isActive }) as unknown as ISubDepartment;
const title = (id: string, subId: string, isActive = true) =>
    ({ _id: id, name: id, subDepartment: { _id: subId }, isActive }) as unknown as IEmploymentTitle;
const office = (id: string, countryId?: string, isActive = true) =>
    ({ _id: id, name: id, country: countryId ? { _id: countryId } : undefined, isActive }) as unknown as IOffice;
const person = (id: string, countryId?: string, isActive = true) =>
    ({ _id: id, name: id, country: countryId ? { _id: countryId } : undefined, isActive }) as unknown as IUser;

describe("user form options", () => {
    it("refId reads plain and populated references", () => {
        expect(refId("a")).toBe("a");
        expect(refId({ _id: "b" })).toBe("b");
        expect(refId(undefined)).toBe("");
    });

    it("selectable drops inactive items but keeps the current one", () => {
        const items = [{ _id: "1", isActive: true }, { _id: "2", isActive: false }, { _id: "3" }];
        expect(selectable(items).map(i => i._id)).toEqual(["1", "3"]);
        expect(selectable(items, "2").map(i => i._id)).toEqual(["1", "2", "3"]);
    });

    it("subDepartmentsOf needs a department and filters to it", () => {
        const subs = [sub("s1", "d1"), sub("s2", "d2"), sub("s3", "d1", false)];
        expect(subDepartmentsOf(subs, "")).toEqual([]);
        expect(subDepartmentsOf(subs, "d1").map(s => s._id)).toEqual(["s1"]);
    });

    it("titlesOf needs a sub-department and filters to it", () => {
        const titles = [title("t1", "s1"), title("t2", "s2"), title("t3", "s1", false)];
        expect(titlesOf(titles, "")).toEqual([]);
        expect(titlesOf(titles, "s1").map(t => t._id)).toEqual(["t1"]);
        expect(titlesOf(titles, "s1", "t3").map(t => t._id)).toEqual(["t1", "t3"]);
    });

    it("secondaryDepartmentsOf excludes the primary and inactive departments unless already saved", () => {
        const depts = [
            { _id: "d1", name: "d1" },
            { _id: "d2", name: "d2" },
            { _id: "d3", name: "d3", isActive: false },
        ] as IDepartment[];
        expect(secondaryDepartmentsOf(depts, "d1").map(d => d._id)).toEqual(["d2"]);
        expect(secondaryDepartmentsOf(depts, "d1", ["d3"]).map(d => d._id)).toEqual(["d2", "d3"]);
    });

    it("secondarySubDepartmentsOf covers every chosen department but never the primary sub-department", () => {
        const subs = [sub("s1", "d1"), sub("s2", "d2"), sub("s3", "d3"), sub("s4", "d2", false)];
        expect(secondarySubDepartmentsOf(subs, ["d1", "d2"], "s1").map(s => s._id)).toEqual(["s2"]);
        expect(secondarySubDepartmentsOf(subs, ["d1", "d2"], "s1", ["s4"]).map(s => s._id)).toEqual(["s2", "s4"]);
    });

    it("keepSecondarySubDepartments drops ids outside the user's departments or equal to the primary", () => {
        const subs = [sub("s1", "d1"), sub("s2", "d2"), sub("s3", "d3")];
        expect(keepSecondarySubDepartments(subs, ["s1", "s2", "s3", "gone"], ["d1", "d2"], "s1")).toEqual(["s2"]);
    });

    it("officesIn keeps offices of the country and country-less offices", () => {
        const offices = [office("o1", "gr"), office("o2", "cy"), office("o3"), office("o4", "gr", false)];
        expect(officesIn(offices, "gr").map(o => o._id)).toEqual(["o1", "o3"]);
        expect(officesIn(offices, "").map(o => o._id)).toEqual(["o1", "o2", "o3"]);
    });

    it("peopleIn keeps active people of the country", () => {
        const people = [person("p1", "gr"), person("p2", "cy"), person("p3"), person("p4", "gr", false)];
        expect(peopleIn(people, "gr").map(p => p._id)).toEqual(["p1", "p3"]);
    });
});
