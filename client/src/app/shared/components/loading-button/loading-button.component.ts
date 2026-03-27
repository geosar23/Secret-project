import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

@Component({
    selector: "app-loading-button",
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule],
    templateUrl: "./loading-button.component.html",
    styleUrls: ["./loading-button.component.scss"],
})
export class LoadingButtonComponent {
    @Input() label = "Save";
    @Input() loadingLabel = "Saving...";
    @Input() loading = false;
    @Input() disabled = false;
    @Input() color: "primary" | "accent" | "warn" = "primary";
    @Input() type: "button" | "submit" = "button";
    @Input() minWidth = "140px";

    @Output() buttonClick = new EventEmitter<MouseEvent>();

    onClick(event: MouseEvent): void {
        this.buttonClick.emit(event);
    }
}
