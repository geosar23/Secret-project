import { Component, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
    selector: "app-not-found",
    standalone: true,
    imports: [RouterLink],
    templateUrl: "./notFound.component.html",
    styleUrls: ["./notFound.component.scss"],
})
export class NotFoundComponent {
    private readonly route = inject(ActivatedRoute);

    readonly displayedText = signal("");

    constructor() {
        this.route.data.pipe(takeUntilDestroyed()).subscribe(() => {
            const routePath = this.route.snapshot.url.map(s => s.path).join("/");
            const customText = this.route.snapshot.queryParams["text"];

            switch (routePath) {
                case "custom":
                    this.displayedText.set(customText || "The requested page not available at the moment.");
                    break;
                case "non-authorized":
                    this.displayedText.set("You are not authorized to view this page.");
                    break;
            }
        });
    }
}
