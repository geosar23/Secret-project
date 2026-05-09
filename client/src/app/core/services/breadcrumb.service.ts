import { Injectable, inject } from "@angular/core";
import { Router, NavigationEnd, ActivatedRoute, PRIMARY_OUTLET } from "@angular/router";
import { BehaviorSubject } from "rxjs";
import { filter } from "rxjs/operators";

export interface BreadcrumbItem {
    label: string;
    route?: string;
}

@Injectable({
    providedIn: "root",
})
export class BreadcrumbService {
    private router = inject(Router);
    private activatedRoute = inject(ActivatedRoute);

    private subject = new BehaviorSubject<BreadcrumbItem[]>([]);
    readonly breadcrumbs$ = this.subject.asObservable();

    constructor() {
        this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
            this.subject.next(this.buildBreadcrumbs(this.activatedRoute.root));
        });
    }

    private buildBreadcrumbs(route: ActivatedRoute, url = "", crumbs: BreadcrumbItem[] = []): BreadcrumbItem[] {
        for (const child of route.children) {
            if (child.outlet !== PRIMARY_OUTLET) {
                continue;
            }

            const label = child.snapshot.routeConfig?.data?.["breadcrumb"] as string | undefined;
            const segments = child.snapshot.url.map(s => s.path).join("/");

            if (segments) {
                url += `/${segments}`;
            }
            if (label) {
                crumbs.push({ label, route: url });
            }

            return this.buildBreadcrumbs(child, url, crumbs);
        }
        return crumbs;
    }

    set(items: BreadcrumbItem[]): void {
        this.subject.next(items);
    }
}
