import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  const isAuthenticated = authService.isAuthenticatedSignal();

  if (isAuthenticated) {
    return true;
  } else {
    // Redirect to login page
    router.navigate(['/auth/login']);
    return false;
  }
};
