import { Component, inject } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

@Component({
    selector: "app-dashboard",
    standalone: true,
    imports: [AsyncPipe, RouterLink],
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
                <div class="quick-actions">
                    <a routerLink="/permissions" class="action-card">
                        <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                fill-rule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        <h3>View Permissions</h3>
                        <p>See what permissions you have access to</p>
                    </a>
                </div>

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

                .quick-actions {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .action-card {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 8px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    text-decoration: none;
                    transition: all 0.2s;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;

                    &:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    }

                    .icon {
                        width: 48px;
                        height: 48px;
                        color: #4299e1;
                        margin-bottom: 1rem;
                    }

                    h3 {
                        margin: 0 0 0.5rem 0;
                        color: #2d3748;
                    }

                    p {
                        margin: 0;
                        color: #718096;
                        font-size: 0.875rem;
                    }
                }

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
