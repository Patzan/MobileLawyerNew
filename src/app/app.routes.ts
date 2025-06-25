import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full',
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
    redirectTo: '/auth/login',
  },
];
