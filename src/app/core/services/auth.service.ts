import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { map, catchError, tap, finalize } from 'rxjs/operators';
import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';
import { LoadingController, ToastController } from '@ionic/angular/standalone';

import { environment } from '../../../environments/environment';
import { LogService } from './log.service';
import { CapacitorHttp, HttpOptions } from '@capacitor/core';

export interface LoginCredentials {
  username: string;
  password: string;
  registerHandle?: string;
}

export interface CapacitorLoginResponse {
  d: boolean;
  data: {
    d: boolean;
  };
  status: number;
  url: string;
  headers: any;
}

export interface LoginResponse {
  d: boolean;
}

export interface UserInfo {
  username: string;
  loginTime: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Modern Angular signals for reactive state management
  private readonly isAuthenticated = signal(false);
  private readonly currentUser = signal<UserInfo | null>(null);

  // Legacy BehaviorSubject for compatibility
  private authState$ = new BehaviorSubject<boolean>(false);
  private userInfo$ = new BehaviorSubject<UserInfo | null>(null);

  // Inject dependencies
  private http = inject(HttpClient);
  private router = inject(Router);
  private logService = inject(LogService);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);

  // Storage keys
  private readonly STORAGE_KEYS = {
    USERNAME: 'NGCSuserName',
    LOGIN_TIME: 'NGCSloginTime',
    IS_AUTHENTICATED: 'NGCSisAuthenticated',
  };

  constructor() {
    this.logService.info('AuthService initialized');
    this.initializeAuthState();
  }

  // Public observables
  get isAuthenticated$(): Observable<boolean> {
    return this.authState$.asObservable();
  }

  get currentUser$(): Observable<UserInfo | null> {
    return this.userInfo$.asObservable();
  }

  // Signal getters for modern reactive patterns
  get isAuthenticatedSignal() {
    return this.isAuthenticated.asReadonly();
  }

  get currentUserSignal() {
    return this.currentUser.asReadonly();
  }

  /**
   * Initialize authentication state on app startup
   */
  private async initializeAuthState(): Promise<void> {
    try {
      const isAuth = await Preferences.get({
        key: this.STORAGE_KEYS.IS_AUTHENTICATED,
      });
      const username = await Preferences.get({
        key: this.STORAGE_KEYS.USERNAME,
      });
      const loginTime = await Preferences.get({
        key: this.STORAGE_KEYS.LOGIN_TIME,
      });

      if (isAuth.value === 'true' && username.value) {
        const userInfo: UserInfo = {
          username: username.value,
          loginTime: loginTime.value || new Date().toISOString(),
        };

        this.setAuthenticationState(true, userInfo);
        this.logService.info('Authentication state restored from storage');
      }
    } catch (error) {
      this.logService.error(error, 'Failed to initialize auth state');
      await this.clearAuthenticationData();
    }
  }

  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<boolean> {
    // Show loading indicator
    const loading = await this.loadingController.create({
      message: 'מתחבר...',
      duration: 30000, // 30 seconds timeout
    });
    await loading.present();

    try {
      this.logService.info(`Login attempt for user: ${credentials.username}`);

      // Get device information
      const deviceInfo = await Device.getInfo();

      // Prepare request data (matching old API structure)
      const loginData = {
        username: credentials.username,
        password: credentials.password,
        registerHandle: credentials.registerHandle || '',
        DeviceOp: deviceInfo.platform || ' ',
        DeviceOpVersion: deviceInfo.osVersion || ' ',
        AppVersion: environment.appVersion || ' ',
      };

      // Check, which HTTP client used
      console.log('Platform info:', await Device.getInfo());
      console.log(
        'Is native context:',
        (window as any).Capacitor?.isNativePlatform()
      );

      const options: HttpOptions = {
        url: `${environment.baseUrl}LoginService.asmx/Login`,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/plain, */*',
          'X-Requested-With': 'il.gov.court.mobile',
        },
        data: loginData,
        webFetchExtra: {
          credentials: 'include' as RequestCredentials,
        },
      };

      const response = (await CapacitorHttp.post(
        options
      )) as CapacitorLoginResponse;

      // const headers = new HttpHeaders({
      //   'Content-Type': 'application/json; text/plain; */*', // ВАЖНО для ASMX
      //   Accept: 'application/json', // Ожидаем JSON ответ
      //   'X-Requested-With': 'il.gov.court.mobile',
      // });

      // const loginUrl = `${environment.baseUrl}LoginService.asmx/Login`;

      // const response = await firstValueFrom(
      //   this.http.post<LoginResponse>(loginUrl, loginData, {
      //     headers,
      //     withCredentials: true, // Important for cookie-based auth
      //   })
      // );

      this.logService.debug('Login response received', response);

      if (response?.data.d === true) {
        // Login successful
        const userInfo: UserInfo = {
          username: credentials.username,
          loginTime: new Date().toISOString(),
        };

        // Store authentication data
        await this.storeAuthenticationData(userInfo);

        // Update state
        this.setAuthenticationState(true, userInfo);

        this.logService.info('Login successful');
        await this.showToast('התחברות בוצעה בהצלחה', 'success');

        return true;
      } else {
        // Login failed
        this.logService.warn('Login failed - incorrect credentials');
        await this.showToast('שם משתמש או סיסמה שגויים', 'danger');
        return false;
      }
    } catch (error: any) {
      this.logService.error(error, 'Login error occurred');

      // Enhanced error handling for .NET ASMX services
      if (error.status === 200 && error.error?.text?.includes('<!DOCTYPE')) {
        // Server returned HTML instead of JSON - likely CORS or authentication issue
        await this.showToast(
          'שגיאת תצורה בשרת. אנא פנה למנהל המערכת',
          'danger'
        );
      } else if (error.status === 419) {
        await this.showToast('תוקף הפעלה פג. אנא התחבר מחדש', 'warning');
      } else if (error.status === 0) {
        await this.showToast('שגיאת רשת. בדוק את החיבור לאינטרנט', 'danger');
      } else if (error.status >= 500) {
        await this.showToast('שגיאת שרת. נסה שוב מאוחר יותר', 'danger');
      } else {
        const errorMessage = error.status
          ? `שגיאת שרת ${error.status}: ${error.statusText || 'שגיאה לא ידועה'}`
          : 'שגיאה לא ידועה. נסה שוב מאוחר יותר';
        await this.showToast(errorMessage, 'danger');
      }

      return false;
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Logout user and clear all data
   */
  async logout(username?: string): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'מתנתק...',
      duration: 10000,
    });
    await loading.present();

    try {
      // Get username from storage if not provided
      if (!username) {
        const storedUsername = await Preferences.get({
          key: this.STORAGE_KEYS.USERNAME,
        });
        username = storedUsername.value || '';
      }

      this.logService.info(`Logout attempt for user: ${username}`);

      // Call logout API (matching old service)
      if (username) {
        const logoutOptions: HttpOptions = {
          url: `${environment.baseUrl}LoginService.asmx/LogOut`,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Accept: 'application/json',
          },
          data: { username },
          webFetchExtra: {
            credentials: 'include' as RequestCredentials,
          },
        };

        try {
          await CapacitorHttp.post(logoutOptions);
        } catch (error) {
          // Ignore logout API errors, continue with local cleanup
          this.logService.warn(
            'Logout API call failed, continuing with local cleanup'
          );
        }
      }

      // Clear all authentication data
      await this.clearAuthenticationData();

      // Update state
      this.setAuthenticationState(false, null);

      // Navigate to login
      this.router.navigate(['/auth/login']);

      this.logService.info('Logout completed');
      await this.showToast('התנתקת בהצלחה', 'success');
    } catch (error) {
      this.logService.error(error, 'Logout error');
      await this.showToast('שגיאה בהתנתקות', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Send device ID to server (matching old sendDeviceId method)
   */
  async sendDeviceId(imei: string, iccid: string): Promise<any> {
    try {
      const deviceOptions: HttpOptions = {
        url: `${environment.baseUrl}DeviceIdService.asmx/ApplyDeviceId`,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Accept: 'application/json',
        },
        data: { imei, iccid },
        webFetchExtra: {
          credentials: 'include' as RequestCredentials,
        },
      };

      return await CapacitorHttp.post(deviceOptions);
    } catch (error) {
      this.logService.error(error, 'SendDeviceId error');
      throw error;
    }
  }

  // Private helper methods

  private setAuthenticationState(
    authenticated: boolean,
    user: UserInfo | null
  ): void {
    // Update signals
    this.isAuthenticated.set(authenticated);
    this.currentUser.set(user);

    // Update legacy observables
    this.authState$.next(authenticated);
    this.userInfo$.next(user);
  }

  private async storeAuthenticationData(userInfo: UserInfo): Promise<void> {
    await Promise.all([
      Preferences.set({
        key: this.STORAGE_KEYS.USERNAME,
        value: userInfo.username,
      }),
      Preferences.set({
        key: this.STORAGE_KEYS.LOGIN_TIME,
        value: userInfo.loginTime,
      }),
      Preferences.set({
        key: this.STORAGE_KEYS.IS_AUTHENTICATED,
        value: 'true',
      }),
    ]);
  }

  private async clearAuthenticationData(): Promise<void> {
    await Promise.all([
      Preferences.remove({ key: this.STORAGE_KEYS.USERNAME }),
      Preferences.remove({ key: this.STORAGE_KEYS.LOGIN_TIME }),
      Preferences.remove({ key: this.STORAGE_KEYS.IS_AUTHENTICATED }),
    ]);
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color,
      cssClass: 'rtl-toast',
    });
    await toast.present();
  }

  /**
   * Get stored username for auto-fill
   */
  async getStoredUsername(): Promise<string | null> {
    const result = await Preferences.get({ key: this.STORAGE_KEYS.USERNAME });
    return result.value;
  }
}
