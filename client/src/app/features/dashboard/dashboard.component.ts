import { Component, inject } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { AuthService } from "../../core/services/auth.service";

@Component({
    selector: "app-dashboard",
    standalone: true,
    imports: [AsyncPipe],
    template: `
        <div class="dashboard">
            <header>
                <h1>Dashboard</h1>
                <div class="user-section">
                    @if (currentUser$ | async; as user) {
                        <span class="welcome-text">Welcome, {{ user.name }}!</span>
                    }
                    <button (click)="logout()" class="btn-logout">Logout</button>
                </div>
            </header>
            <div class="content">
                <p>You are successfully logged in.</p>
                @if (currentUser$ | async; as user) {
                    <div class="user-info">
                        <h3>Your Profile</h3>
                        <p><strong>Name:</strong> {{ user.name }}</p>
                        <p><strong>Email:</strong> {{ user.email }}</p>
                    </div>
                }
            </div>
        </div>
    `,
    styles: [
        `
            .dashboard {
                min-height: 100vh;
                background: #f7fafc;
            }

            header {
                background: white;
                padding: 1rem 2rem;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;

                h1 {
                    margin: 0;
                    font-size: 1.5rem;
                    color: #2d3748;
                }

                .user-section {
                    display: flex;
                    align-items: center;
                    gap: 1rem;

                    .welcome-text {
                        color: #4a5568;
                        font-weight: 500;
                    }
                }
            }

            .content {
                padding: 2rem;

                .user-info {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 8px;
                    margin-top: 1rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

                    h3 {
                        margin-top: 0;
                        color: #2d3748;
                    }

                    p {
                        margin: 0.5rem 0;
                        color: #4a5568;
                    }
                }
            }

            .btn-logout {
                padding: 0.5rem 1rem;
                background: #f56565;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;

                &:hover {
                    background: #e53e3e;
                }
            }
        `,
    ],
})
export class DashboardComponent {
    private authService = inject(AuthService);
    currentUser$ = this.authService.currentUser$;

    logout(): void {
        this.authService.logout();
    }
}
