import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    OnInit,
    computed,
    inject,
    signal,
    viewChild,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ActivatedRoute } from "@angular/router";
import { take } from "rxjs";
import { AuthService } from "../../core/services/auth.service";
import { CompanyService } from "../../core/services/company.service";
import { CurrentUserService } from "../../core/services/current-user.service";
import { OrgChartService } from "../../core/services/org-chart.service";
import { IOrgChartData } from "../../core/interfaces/org-chart.interface";
import { tokenPayload } from "../../core/interfaces/auth.interface";
import { decodeToken } from "../../core/utils/token.util";
import {
    OrgNode,
    OrgView,
    buildDepartmentTree,
    buildLegend,
    buildManagerTree,
    countDescendants,
    findNode,
    flattenNodes,
    layoutTree,
} from "./org-chart.layout";
import { initialsOf } from "../../core/utils/name.utils";

const MIN_SCALE = 0.2;
const MAX_SCALE = 2.5;
const FIT_PADDING = 60;

interface Point {
    x: number;
    y: number;
}

@Component({
    selector: "app-org-chart",
    standalone: true,
    imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
    templateUrl: "./org-chart.component.html",
    styleUrls: ["./org-chart.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgChartComponent implements OnInit {
    private orgChartService = inject(OrgChartService);
    private companyService = inject(CompanyService);
    private authService = inject(AuthService);
    private currentUser = inject(CurrentUserService);
    private route = inject(ActivatedRoute);

    private canvasWrap = viewChild<ElementRef<HTMLElement>>("canvasWrap");

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    private data = signal<IOrgChartData | null>(null);
    private companyName = signal("Company");

    readonly view = signal<OrgView>("manager");
    readonly search = signal("");
    readonly selectedId = signal<string | null>(null);
    private collapsed = signal<ReadonlySet<string>>(new Set());

    readonly scale = signal(1);
    private panX = signal(0);
    private panY = signal(0);
    readonly panning = signal(false);
    readonly animating = signal(false);

    readonly myId = computed(() => this.currentUser.user()?._id ?? null);

    private root = computed<OrgNode | null>(() => {
        const data = this.data();
        if (!data) {
            return null;
        }
        return this.view() === "manager"
            ? buildManagerTree(data, this.companyName())
            : buildDepartmentTree(data, this.companyName());
    });

    readonly layout = computed(() => {
        const root = this.root();
        return root ? layoutTree(root, this.collapsed()) : null;
    });

    readonly legend = computed(() => {
        const data = this.data();
        return data && this.view() === "manager" ? buildLegend(data) : [];
    });

    /** Ids of nodes matching the search box, or null when the search is empty. */
    readonly matches = computed<ReadonlySet<string> | null>(() => {
        const query = this.search().trim().toLowerCase();
        if (!query) {
            return null;
        }
        return new Set(
            flattenNodes(this.root())
                .filter(n => [n.name, n.subtitle, n.email, n.department].some(f => f.toLowerCase().includes(query)))
                .map(n => n.id),
        );
    });

    readonly selected = computed(() => {
        const id = this.selectedId();
        return id ? findNode(this.root(), id) : null;
    });

    readonly selectedStats = computed(() => {
        const node = this.selected();
        return node ? { direct: node.children.length, total: countDescendants(node) } : null;
    });

    readonly canvasTransform = computed(() => `translate(${this.panX()}px, ${this.panY()}px) scale(${this.scale()})`);

    private pointers = new Map<number, Point>();
    private panOrigin: { pointer: Point; panX: number; panY: number } | null = null;
    private pinchDistance: number | null = null;

    ngOnInit(): void {
        this.loadCompanyName();
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.orgChartService.getOrgChart().subscribe({
            next: res => {
                if (!res.success || !res.data) {
                    this.error.set(res.message || "Failed to load the org chart");
                } else {
                    this.data.set(res.data);
                }
                this.loading.set(false);
                const focusId = this.route.snapshot.queryParamMap.get("focus");
                if (focusId && findNode(this.root(), focusId)) {
                    this.selectedId.set(focusId);
                    this.focusSoon(focusId);
                } else {
                    // No explicit target: centre on the logged-in user when they're in the chart.
                    const myId = this.myId();
                    if (myId && findNode(this.root(), myId)) {
                        this.focusSoon(myId);
                        this.selectedId.set(myId);
                    } else {
                        this.fitSoon();
                    }
                }
            },
            error: err => {
                this.error.set(err.error?.message || "Failed to load the org chart");
                this.loading.set(false);
            },
        });
    }

    private loadCompanyName(): void {
        const token = this.authService.getToken();
        const companyId = token ? (decodeToken(token) as tokenPayload | null)?.companyId : undefined;
        if (!companyId) {
            return;
        }
        this.companyService
            .getCompanyData(companyId)
            .pipe(take(1))
            .subscribe({
                next: res => {
                    if (res.success && res.data?.name) {
                        this.companyName.set(res.data.name);
                    }
                },
                error: () => {
                    /* keep the default label */
                },
            });
    }

    initials(name: string): string {
        return initialsOf(name);
    }

    switchView(view: OrgView): void {
        if (view === this.view()) {
            return;
        }
        this.view.set(view);
        this.collapsed.set(new Set());
        this.selectedId.set(null);
        this.fitSoon();
    }

    isCollapsed(id: string): boolean {
        return this.collapsed().has(id);
    }

    toggleCollapse(event: Event, id: string): void {
        event.stopPropagation();
        this.collapsed.update(current => {
            const next = new Set(current);
            if (!next.delete(id)) {
                next.add(id);
            }
            return next;
        });
    }

    select(id: string): void {
        this.selectedId.update(current => (current === id ? null : id));
    }

    closeInfo(): void {
        this.selectedId.set(null);
    }

    isDimmed(id: string): boolean {
        const matches = this.matches();
        return !!matches && !matches.has(id);
    }

    isHighlighted(id: string): boolean {
        return !!this.matches()?.has(id);
    }

    // ── Pan & zoom ──

    zoom(factor: number, center?: Point): void {
        const wrap = this.canvasWrap()?.nativeElement;
        if (!wrap) {
            return;
        }
        const rect = wrap.getBoundingClientRect();
        const cx = center?.x ?? rect.width / 2;
        const cy = center?.y ?? rect.height / 2;
        const current = this.scale();
        const next = Math.min(Math.max(current * factor, MIN_SCALE), MAX_SCALE);
        this.panX.update(x => cx - (cx - x) * (next / current));
        this.panY.update(y => cy - (cy - y) * (next / current));
        this.scale.set(next);
    }

    fitToScreen(): void {
        const wrap = this.canvasWrap()?.nativeElement;
        const layout = this.layout();
        if (!wrap || !layout) {
            return;
        }
        const rect = wrap.getBoundingClientRect();
        const { minX, maxX, minY, maxY } = layout.bounds;
        const width = maxX - minX;
        const height = maxY - minY;
        const scale = Math.min((rect.width - FIT_PADDING) / width, (rect.height - FIT_PADDING) / height, 1.2);
        this.animating.set(true);
        this.scale.set(scale);
        this.panX.set(rect.width / 2 - ((minX + maxX) / 2) * scale);
        this.panY.set(rect.height / 2 - ((minY + maxY) / 2) * scale);
        setTimeout(() => this.animating.set(false), 420);
    }

    /** Centre the canvas on one node at a readable zoom. */
    private focusOn(id: string): void {
        const wrap = this.canvasWrap()?.nativeElement;
        const item = this.layout()?.nodes.find(n => n.node.id === id);
        if (!wrap || !item) {
            return;
        }
        const rect = wrap.getBoundingClientRect();
        const scale = Math.min(Math.max(this.scale(), 0.8), 1);
        this.animating.set(true);
        this.scale.set(scale);
        this.panX.set(rect.width / 2 - item.x * scale);
        this.panY.set(rect.height / 2 - item.y * scale);
        setTimeout(() => this.animating.set(false), 420);
    }

    private focusSoon(id: string): void {
        setTimeout(() => this.focusOn(id), 50);
    }

    /** Fit once the new layout has been rendered. */
    private fitSoon(): void {
        setTimeout(() => this.fitToScreen(), 50);
    }

    onWheel(event: WheelEvent): void {
        event.preventDefault();
        const rect = this.canvasWrap()!.nativeElement.getBoundingClientRect();
        this.zoom(event.deltaY < 0 ? 1.08 : 0.93, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    }

    onPointerDown(event: PointerEvent): void {
        const target = event.target as HTMLElement;
        if (target.closest(".node, .zoom-controls, .info-panel, .legend")) {
            return;
        }
        this.canvasWrap()!.nativeElement.setPointerCapture(event.pointerId);
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.pointers.size === 1) {
            this.beginPan({ x: event.clientX, y: event.clientY });
        } else if (this.pointers.size === 2) {
            this.pinchDistance = this.pointerDistance();
            this.panOrigin = null;
        }
    }

    onPointerMove(event: PointerEvent): void {
        if (!this.pointers.has(event.pointerId)) {
            return;
        }
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (this.pointers.size === 2) {
            const distance = this.pointerDistance();
            if (this.pinchDistance) {
                const rect = this.canvasWrap()!.nativeElement.getBoundingClientRect();
                const [a, b] = [...this.pointers.values()];
                this.zoom(distance / this.pinchDistance, {
                    x: (a.x + b.x) / 2 - rect.left,
                    y: (a.y + b.y) / 2 - rect.top,
                });
            }
            this.pinchDistance = distance;
        } else if (this.panOrigin) {
            this.panX.set(this.panOrigin.panX + event.clientX - this.panOrigin.pointer.x);
            this.panY.set(this.panOrigin.panY + event.clientY - this.panOrigin.pointer.y);
        }
    }

    onPointerUp(event: PointerEvent): void {
        this.pointers.delete(event.pointerId);
        this.pinchDistance = null;
        if (this.pointers.size === 1) {
            // A pinch ended with one finger still down: carry on panning from where it is.
            this.beginPan([...this.pointers.values()][0]);
        } else if (this.pointers.size === 0) {
            this.panOrigin = null;
            this.panning.set(false);
        }
    }

    private beginPan(pointer: Point): void {
        this.panOrigin = { pointer, panX: this.panX(), panY: this.panY() };
        this.panning.set(true);
    }

    private pointerDistance(): number {
        const [a, b] = [...this.pointers.values()];
        return Math.hypot(a.x - b.x, a.y - b.y);
    }
}
