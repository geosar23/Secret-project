import { officesIn, peopleIn, refId, selectable, subDepartmentsOf, titlesOf } from "./user-form-options";
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
