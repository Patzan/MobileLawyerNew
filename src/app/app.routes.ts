import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/check-version',
    pathMatch: 'full',
  },

  // Version check - first page (no auth required)
  {
    path: 'check-version',
    loadComponent: () =>
      import('./pages/auth/check-version/check-version.page').then(
        (m) => m.CheckVersionPage
      ),
  },

  // Authentication routes (no auth required)
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/auth/login/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'accept-policy',
        loadComponent: () =>
          import('./pages/auth/accept-policy/accept-policy.page').then(
            (m) => m.AcceptPolicyPage
          ),
      },
    ],
  },

  // Protected routes (require authentication)
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [AuthGuard],
  },

  // Fallback route
  {
    path: '**',
    redirectTo: '/check-version',
  },
];
