import { Component, signal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { UpperCasePipe } from "@angular/common";
import { environment } from '../environments/environment';

@Component({
    selector: "app-root",
    imports: [RouterOutlet, UpperCasePipe],
    templateUrl: "./app.html",
    styleUrl: "./app.scss",
})
export class App {
    protected readonly title = signal("client");
    protected readonly environment = environment;
}
