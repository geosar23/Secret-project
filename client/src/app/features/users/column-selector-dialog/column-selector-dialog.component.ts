import { Component, Inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatDividerModule } from "@angular/material/divider";
import { MatIconModule } from "@angular/material/icon";
import { MatBadgeModule } from "@angular/material/badge";

export interface ColumnDef {
    key: string;
    label: string;
    group: string;
}

export interface ColumnSelectorData {
    availableColumns: ColumnDef[];
    selectedKeys: string[];
    maxColumns: number;
}

@Component({
    selector: "app-column-selector-dialog",
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatCheckboxModule,
        MatDividerModule,
        MatIconModule,
        MatBadgeModule,
    ],
    template: `
        <div class="dialog-header">
            <mat-icon>view_column</mat-icon>
            <h2 mat-dialog-title>Select Columns</h2>
            <span class="selection-count" [class.at-limit]="selected.size >= data.maxColumns">
                {{ selected.size }} / {{ data.maxColumns }} selected
            </span>
        </div>
        <mat-dialog-content class="dialog-content">
            <p class="hint">Choose up to {{ data.maxColumns }} additional columns to display in the table.</p>

            @for (group of groups; track group) {
                <div class="column-group">
                    <h4 class="group-label">{{ group }}</h4>
                    <div class="column-grid">
                        @for (col of getColumnsByGroup(group); track col.key) {
                            <mat-checkbox
                                [checked]="selected.has(col.key)"
                                [disabled]="!selected.has(col.key) && selected.size >= data.maxColumns"
                                (change)="toggleColumn(col.key, $event.checked)"
                            >
                                {{ col.label }}
                            </mat-checkbox>
                        }
                    </div>
                </div>
                <mat-divider />
            }
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button (click)="reset()">
                <mat-icon>restart_alt</mat-icon>
                Reset
            </button>
            <button mat-button mat-dialog-close>Cancel</button>
            <button mat-flat-button color="primary" (click)="apply()">Apply</button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            .dialog-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 1.25rem 1.5rem 0;

                h2 {
                    margin: 0;
                    flex: 1;
                    font-size: 1.125rem;
                    font-weight: 600;
                }

                mat-icon {
                    color: var(--color-primary-500, #1976d2);
                }
            }

            .selection-count {
                font-size: 0.8rem;
                font-weight: 600;
                color: var(--color-text-secondary, #666);
                background: var(--color-surface-secondary, #f0f0f0);
                padding: 0.2rem 0.6rem;
                border-radius: 999px;
                white-space: nowrap;

                &.at-limit {
                    color: var(--color-warning, #f57c00);
                    background: var(--color-warning-bg, #fff3e0);
                }
            }

            ::ng-deep [mat-dialog-title] {
                margin: 0 !important;
                padding: 0 !important;
            }

            .dialog-content {
                padding: 0.75rem 1.5rem !important;
                max-height: 60vh;
                min-width: 480px;
            }

            .hint {
                font-size: 0.82rem;
                color: var(--color-text-secondary, #666);
                margin: 0 0 1rem;
            }

            .column-group {
                margin-bottom: 0.75rem;
            }

            .group-label {
                font-size: 0.7rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                color: var(--color-text-secondary, #888);
                margin: 0.75rem 0 0.5rem;
            }

            .column-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 0.25rem 0.5rem;
            }

            mat-divider {
                margin: 0.25rem 0;
            }
        `,
    ],
})
export class ColumnSelectorDialogComponent {
    selected: Set<string>;
    groups: string[];

    constructor(
        public dialogRef: MatDialogRef<ColumnSelectorDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ColumnSelectorData,
    ) {
        this.selected = new Set(data.selectedKeys);
        this.groups = [...new Set(data.availableColumns.map(c => c.group))];
    }

    getColumnsByGroup(group: string): ColumnDef[] {
        return this.data.availableColumns.filter(c => c.group === group);
    }

    toggleColumn(key: string, checked: boolean) {
        if (checked) {
            if (this.selected.size < this.data.maxColumns) {
                this.selected.add(key);
            }
        } else {
            this.selected.delete(key);
        }
    }

    reset() {
        this.selected.clear();
    }

    apply() {
        this.dialogRef.close([...this.selected]);
    }
}
