import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    template: `
        <div class="dashboard">
            <header>
                <h1>Dashboard</h1>
                <button (click)="logout()" class="btn-logout">Logout</button>
            </header>
            <div class="content">
                <p>Welcome! You are successfully logged in.</p>
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
            }

            .content {
                padding: 2rem;
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

    logout(): void {
        this.authService.logout();
    }
}
