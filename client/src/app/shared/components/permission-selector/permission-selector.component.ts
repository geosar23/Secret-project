import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatBadgeModule } from "@angular/material/badge";
import { MatChipsModule } from "@angular/material/chips";
import { MatTooltipModule } from "@angular/material/tooltip";
import { PermissionCategoriesStrings, PermissionKeys } from "../../../core/enums/permissions.enum";

interface PermissionEntry {
    key: string;
    action: string;
    scope: string;
    visible: boolean;
}

interface PermissionGroup {
    category: string;
    categoryLabel: string;
    permissions: PermissionEntry[];
    expanded: boolean;
}

@Component({
    selector: "app-permission-selector",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCheckboxModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        MatBadgeModule,
        MatChipsModule,
        MatTooltipModule,
    ],
    templateUrl: "./permission-selector.component.html",
    styleUrls: ["./permission-selector.component.scss"],
})
export class PermissionSelectorComponent implements OnInit, OnChanges {
    @Input() selected: string[] = [];
    @Output() selectedChange = new EventEmitter<string[]>();

    searchControl = new FormControl("");
    groups: PermissionGroup[] = [];
    private selectedSet = new Set<string>();

    ngOnInit(): void {
        this.buildGroups();
        this.syncSelection();

        this.searchControl.valueChanges.subscribe(term => {
            this.applyFilter(term ?? "");
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes["selected"] && !changes["selected"].firstChange) {
            this.syncSelection();
        }
    }

    // ── Selection ──────────────────────────────────────────────────────────

    isSelected(key: string): boolean {
        return this.selectedSet.has(key);
    }

    togglePermission(key: string): void {
        if (this.selectedSet.has(key)) {
            this.selectedSet.delete(key);
        } else {
            this.selectedSet.add(key);
        }
        this.emitChange();
    }

    toggleGroup(group: PermissionGroup): void {
        const visibleKeys = group.permissions.filter(p => p.visible).map(p => p.key);
        const allSelected = visibleKeys.every(k => this.selectedSet.has(k));

        if (allSelected) {
            visibleKeys.forEach(k => this.selectedSet.delete(k));
        } else {
            visibleKeys.forEach(k => this.selectedSet.add(k));
        }
        this.emitChange();
    }

    isGroupAllSelected(group: PermissionGroup): boolean {
        const visibleKeys = group.permissions.filter(p => p.visible);
        return visibleKeys.length > 0 && visibleKeys.every(p => this.selectedSet.has(p.key));
    }

    isGroupPartiallySelected(group: PermissionGroup): boolean {
        const visibleKeys = group.permissions.filter(p => p.visible);
        const someSelected = visibleKeys.some(p => this.selectedSet.has(p.key));
        const allSelected = visibleKeys.every(p => this.selectedSet.has(p.key));
        return someSelected && !allSelected;
    }

    groupSelectedCount(group: PermissionGroup): number {
        return group.permissions.filter(p => this.selectedSet.has(p.key)).length;
    }

    get totalSelected(): number {
        return this.selectedSet.size;
    }

    get totalPermissions(): number {
        return Object.keys(PermissionKeys).length;
    }

    selectAll(): void {
        Object.values(PermissionKeys).forEach(k => this.selectedSet.add(k));
        this.emitChange();
    }

    clearAll(): void {
        this.selectedSet.clear();
        this.emitChange();
    }

    expandAll(): void {
        this.groups.forEach(g => (g.expanded = true));
    }

    collapseAll(): void {
        this.groups.forEach(g => (g.expanded = false));
    }

    hasVisiblePermissions(group: PermissionGroup): boolean {
        return group.permissions.some(p => p.visible);
    }

    formatScope(scope: string): string {
        if (scope === "*") {
            return "All";
        }
        return scope
            .split("-")
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" & ");
    }

    formatAction(action: string): string {
        if (action === "*") {
            return "All";
        }
        return action.charAt(0).toUpperCase() + action.slice(1);
    }

    // ── Internal ──────────────────────────────────────────────────────────

    private buildGroups(): void {
        const grouped = new Map<string, PermissionEntry[]>();

        Object.values(PermissionKeys).forEach(key => {
            const parts = key.split(":");
            const category = parts[0];
            const action = parts[1] ?? "*";
            const scope = parts[2] ?? "*";

            if (!grouped.has(category)) {
                grouped.set(category, []);
            }
            grouped.get(category)!.push({ key, action, scope, visible: true });
        });

        this.groups = Array.from(grouped.entries()).map(([category, permissions]) => ({
            category,
            categoryLabel:
                PermissionCategoriesStrings[category as keyof typeof PermissionCategoriesStrings] ?? category,
            permissions: permissions.sort((a, b) => {
                const actionOrder = a.action.localeCompare(b.action);
                return actionOrder !== 0 ? actionOrder : a.scope.localeCompare(b.scope);
            }),
            expanded: false,
        }));
    }

    private syncSelection(): void {
        this.selectedSet = new Set(this.selected ?? []);
    }

    private applyFilter(term: string): void {
        const lower = term.toLowerCase().trim();

        this.groups.forEach(group => {
            group.permissions.forEach(p => {
                if (!lower) {
                    p.visible = true;
                } else {
                    p.visible =
                        p.key.toLowerCase().includes(lower) ||
                        p.action.toLowerCase().includes(lower) ||
                        p.scope.toLowerCase().includes(lower) ||
                        group.categoryLabel.toLowerCase().includes(lower);
                }
            });

            // Auto-expand groups that have matching results
            if (lower && group.permissions.some(p => p.visible)) {
                group.expanded = true;
            }
        });
    }

    private emitChange(): void {
        this.selectedChange.emit(Array.from(this.selectedSet));
    }
}
