import { Injectable, inject } from "@angular/core";
import { NavigationEnd, NavigationStart, Router } from "@angular/router";
import type { BreadcrumbItem } from "./breadcrumb.service";

export interface HistoryEntry {
    url: string;
    /** Breadcrumbs the page showed, so the next page can continue the same path. */
    crumbs?: BreadcrumbItem[];
}

const MAX_ENTRIES = 30;

export function pathOf(url: string): string {
    return url.split(/[?#]/)[0];
}

/**
 * In-app trail of the pages the user went through, so a page entered from several places
 * (profile, users list, org chart...) can send them back to where they actually came from.
 *
 * - Visiting the same path twice in a row replaces the entry (filter / tab changes via query params).
 * - Going back (browser button or `back()`) cuts the trail at the page returned to instead of growing it.
 * - A page reloaded in the browser starts a fresh trail, so `back()` falls back to its default.
 */
@Injectable({
    providedIn: "root",
})
export class NavigationHistoryService {
    private router = inject(Router);

    private entries: HistoryEntry[] = [];
    private backRequested = false;
    private restoring = false;

    constructor() {
        this.router.events.subscribe(event => {
            if (event instanceof NavigationStart) {
                this.restoring = event.navigationTrigger === "popstate" || this.backRequested;
                this.backRequested = false;
            } else if (event instanceof NavigationEnd) {
                this.record(event.urlAfterRedirects);
            }
        });
    }

    /** The page before the current one, or null when the trail has none (direct link, reload, fresh login). */
    previous(): HistoryEntry | null {
        return this.entries[this.entries.length - 2] ?? null;
    }

    /** Remember the breadcrumbs of the current page so the next page can continue them. */
    setCrumbs(crumbs: BreadcrumbItem[]): void {
        const current = this.entries[this.entries.length - 1];
        if (current) {
            current.crumbs = crumbs;
        }
    }

    /** Return to the page the user came from, or to `fallback` when there is none. */
    back(fallback: string): void {
        const previous = this.previous();
        this.backRequested = !!previous;
        void this.router.navigateByUrl(previous?.url ?? fallback);
    }

    private record(url: string): void {
        const path = pathOf(url);
        if (path === "/login") {
            this.entries = [];
            return;
        }

        const last = this.entries[this.entries.length - 1];
        if (last && pathOf(last.url) === path) {
            last.url = url;
            return;
        }

        if (this.restoring) {
            for (let i = this.entries.length - 1; i >= 0; i--) {
                if (pathOf(this.entries[i].url) === path) {
                    this.entries.length = i + 1;
                    this.entries[i].url = url;
                    return;
                }
            }
        }

        this.entries.push({ url });
        if (this.entries.length > MAX_ENTRIES) {
            this.entries.shift();
        }
    }
}
