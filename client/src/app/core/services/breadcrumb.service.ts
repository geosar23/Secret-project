import { Injectable, inject } from "@angular/core";
import { Router, NavigationEnd, ActivatedRoute, Params, PRIMARY_OUTLET } from "@angular/router";
import { BehaviorSubject } from "rxjs";
import { filter } from "rxjs/operators";
import { NavigationHistoryService, pathOf } from "./navigation-history.service";

export interface BreadcrumbItem {
    label: string;
    route?: string;
    queryParams?: Params;
}

const MAX_PARENTS = 3;

/**
 * Breadcrumbs follow the route tree. A route marked `data: { originAware: true }` is a page reached from
 * several places (edit / create / profile): its parent crumbs are replaced by the path of the page the user
 * came from, and the route tree is only used when there is no such page (direct link, reload).
 */
@Injectable({
    providedIn: "root",
})
export class BreadcrumbService {
    private router = inject(Router);
    private activatedRoute = inject(ActivatedRoute);
    // Injected first so its NavigationEnd handler runs before ours and `previous()` is already up to date.
    private history = inject(NavigationHistoryService);

    private subject = new BehaviorSubject<BreadcrumbItem[]>([]);
    readonly breadcrumbs$ = this.subject.asObservable();

    private originAware = false;
    private treeParents: BreadcrumbItem[] = [];

    constructor() {
        this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
            const crumbs = this.buildBreadcrumbs(this.activatedRoute.root);
            this.originAware = this.isOriginAware(this.activatedRoute.root);
            this.treeParents = crumbs.slice(0, -1);
            this.publish(this.originAware ? crumbs.slice(-1) : crumbs);
        });
    }

    /** Set the crumbs of the current page. On origin-aware pages, leave out the parents: they are added here. */
    set(items: BreadcrumbItem[]): void {
        this.publish(items);
    }

    private publish(own: BreadcrumbItem[]): void {
        const crumbs = this.originAware ? [...this.parentsFor(own), ...own] : own;
        this.subject.next(crumbs);
        this.history.setCrumbs(crumbs);
    }

    /** The path that led here: the previous page's breadcrumbs, minus a page this one repeats. */
    private parentsFor(own: BreadcrumbItem[]): BreadcrumbItem[] {
        const origin = this.history.previous();
        if (!origin?.crumbs?.length) {
            return this.treeParents;
        }

        const parents = origin.crumbs.slice(-MAX_PARENTS);
        const last = parents[parents.length - 1];
        const repeated = own[0] && (own[0].label === last.label || own[0].route === pathOf(origin.url));
        if (repeated) {
            return parents.slice(0, -1);
        }
        // Keep the filters / tab the previous page was left with on its own crumb.
        parents[parents.length - 1] = {
            ...last,
            route: pathOf(origin.url),
            queryParams: this.router.parseUrl(origin.url).queryParams,
        };
        return parents;
    }

    private isOriginAware(route: ActivatedRoute): boolean {
        let current = route;
        for (let next = this.primaryChild(current); next; next = this.primaryChild(current)) {
            current = next;
        }
        return current.snapshot.routeConfig?.data?.["originAware"] === true;
    }

    private primaryChild(route: ActivatedRoute): ActivatedRoute | undefined {
        return route.children.find(child => child.outlet === PRIMARY_OUTLET);
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
}
