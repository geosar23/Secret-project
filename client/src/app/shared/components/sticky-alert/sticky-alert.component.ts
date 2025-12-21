import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";

@Component({
    selector: "app-sticky-alert",
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule, MatChipsModule],
    templateUrl: "./sticky-alert.component.html",
    styleUrls: ["./sticky-alert.component.scss"],
})
export class StickyAlertComponent {
    @Input() isActive: boolean = false;
    @Input() isLoading: boolean = false;
    @Input() title: string = "";
    @Input() message: string = "";
    @Input() backgroundColor: string = "linear-gradient(135deg, #f59e0b, #ec4899)";
    @Input() opacity: number = 1;
    @Input() zIndex: number = 1000;
    @Input() icon: string = "info";
    @Input() contentLabel?: string;
    @Input() contentColor?: string;
    @Input() showCloseButton: boolean = true;
    @Output() onClose = new EventEmitter<void>();

    closeAlert(): void {
        this.onClose.emit();
    }
}
