import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LogService } from '../services/log.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);
  private logService = inject(LogService);
  private router = inject(Router);

  private isHandlingAuth = false;

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Skip authentication handling for specific endpoints
    if (this.shouldSkipAuth(req)) {
      return next.handle(req);
    }

    // Add headers to all authenticated requests (like old withCredentials: true)
    const authReq = req.clone({
      setHeaders: {
        'X-Requested-With': 'il.gov.court.mobile',
      },
    });

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (this.isAuthError(error)) {
          return this.handleAuthError(error);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Check if request should skip authentication handling
   */
  private shouldSkipAuth(req: HttpRequest<any>): boolean {
    const skipEndpoints = ['Login', 'GetVersion', 'SendSms', 'ApplyPasscode'];

    return skipEndpoints.some((endpoint) => req.url.includes(endpoint));
  }

  /**
   * Check if error is authentication related
   */
  private isAuthError(error: HttpErrorResponse): boolean {
    return error.status === 401 || error.status === 419;
  }

  /**
   * Handle authentication errors (like old HttpAutorizationHandling)
   */
  private handleAuthError(
    error: HttpErrorResponse
  ): Observable<HttpEvent<any>> {
    this.logService.warn(`Authentication error ${error.status} detected`, {
      url: error.url,
      status: error.status,
      statusText: error.statusText,
    });

    if (!this.isHandlingAuth) {
      this.isHandlingAuth = true;

      // Clear local authentication state
      this.authService.clearAuthenticationData();

      // Determine login modal type based on error (like old getLoginModalType)
      const loginType = this.getLoginModalType(error);
      this.logService.info(`Opening login modal type: ${loginType}`);

      // Navigate to appropriate login page
      this.navigateToLogin(loginType);

      // Reset flag after delay
      setTimeout(() => {
        this.isHandlingAuth = false;
      }, 1000);
    }

    // Return empty observable (don't retry the request automatically)
    return EMPTY;
  }

  /**
   * Determine login modal type based on error headers (like old project)
   */
  private getLoginModalType(error: HttpErrorResponse): string {
    const wwwAuthHeader = error.headers.get('www-authenticate');

    if (error.status === 401) {
      // Not authorized
      switch (wwwAuthHeader) {
        case 'passcode':
          return 'passcode';
        case 'deviceid':
          return 'deviceid';
        default:
          return 'login';
      }
    } else if (error.status === 419) {
      // Authentication timed out
      switch (wwwAuthHeader) {
        case 'passcode':
          return 'passcode'; // Still same passcode view when passcode is expired
        case 'deviceid':
          return 'deviceid-expired';
        default:
          return 'login-expired';
      }
    }

    return 'login';
  }

  /**
   * Navigate to appropriate login page based on error type
   */
  private navigateToLogin(loginType: string): void {
    let route = '/auth/login';
    let queryParams: any = {
      reason: loginType,
      returnUrl: this.router.url,
    };

    switch (loginType) {
      case 'passcode':
        // route = '/auth/passcode'; // Will be implemented later
        this.logService.info('Passcode authentication required');
        break;
      case 'deviceid':
      case 'deviceid-expired':
        // route = '/auth/deviceid'; // Will be implemented later
        this.logService.info('Device ID authentication required');
        break;
      case 'login-expired':
        this.logService.info('Login session expired');
        queryParams.message = 'תוקף הפעלה פג. אנא התחבר מחדש';
        break;
      case 'login':
      default:
        this.logService.info('Standard login required');
        break;
    }

    this.router.navigate([route], {
      queryParams,
      replaceUrl: true,
    });
  }
}
