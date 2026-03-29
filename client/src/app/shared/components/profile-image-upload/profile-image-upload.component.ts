import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, ViewChild, ElementRef } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";

@Component({
    selector: "app-profile-image-upload",
    standalone: true,
    imports: [CommonModule, MatButtonModule],
    templateUrl: "./profile-image-upload.component.html",
    styleUrls: ["./profile-image-upload.component.scss"],
})
export class ProfileImageUploadComponent {
    @Input() label = "Profile Image";
    @Input() selectedPreviewUrl: string | null = null;
    @Input() currentImageUrl: string | null = null;
    @Input() removeCurrentRequested = false;
    @Input() loading = false;
    @Input() disabled = false;
    @Input() showRemoveCurrentAction = true;
    @Input() maxFileSizeMb = 5;

    @Output() fileSelected = new EventEmitter<File>();
    @Output() clearSelection = new EventEmitter<void>();
    @Output() removeCurrent = new EventEmitter<void>();
    @Output() validationError = new EventEmitter<string>();

    @ViewChild("fileInput") fileInput?: ElementRef<HTMLInputElement>;

    get displayedImageUrl(): string | null {
        if (this.removeCurrentRequested) {
            return null;
        }

        return this.selectedPreviewUrl || this.currentImageUrl;
    }

    openPicker(): void {
        if (this.disabled || this.loading) {
            return;
        }

        this.fileInput?.nativeElement.click();
    }

    onFileChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            this.validationError.emit("Please select an image file");
            this.resetInput();
            return;
        }

        if (file.size > this.maxFileSizeMb * 1024 * 1024) {
            this.validationError.emit(`Image must be smaller than ${this.maxFileSizeMb}MB`);
            this.resetInput();
            return;
        }

        this.fileSelected.emit(file);
    }

    onClearSelection(): void {
        this.resetInput();
        this.clearSelection.emit();
    }

    onRemoveCurrent(): void {
        this.resetInput();
        this.removeCurrent.emit();
    }

    private resetInput(): void {
        if (this.fileInput?.nativeElement) {
            this.fileInput.nativeElement.value = "";
        }
    }
}
