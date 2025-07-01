import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonCardTitle,
  IonList,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonSpinner,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eye, eyeOff } from 'ionicons/icons';

// Capacitor imports
import { PushNotifications } from '@capacitor/push-notifications';
import { PolicyService } from '../../../core/services/policy.service';

// Services
import {
  AuthService,
  LoginCredentials,
} from '../../../core/services/auth.service';
import { LogService } from '../../../core/services/log.service';
import { environment } from '../../../../environments/environment';
import { ApiTestService } from 'src/app/core/services/api-test.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonCardTitle,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonText,
    IonSpinner,
  ],
})
export class LoginPage implements OnInit {
  // Inject services using modern Angular approach
  private authService = inject(AuthService);
  private logService = inject(LogService);
  private router = inject(Router);
  private formBuilder = inject(FormBuilder);
  private platform = inject(Platform);
  private policyService = inject(PolicyService);

  // Reactive form
  loginForm!: FormGroup;

  // Signals for reactive state
  isLoading = signal(false);
  showPassword = signal(false);
  incorrectPasswordAlert = signal(false);
  serverAccessErrorAlert = signal(false);
  serverAccessErrorDetails = signal('');

  // Push notification registration handle
  private registerHandle: string = '';

  constructor() {
    // Register icons
    addIcons({ eye, eyeOff });

    this.logService.info('LoginPage initialized');
  }

  ngOnInit() {
    this.initializeForm();
    //alert('Connect to WiFi');
    this.initializePushNotifications();
    //alert('Connect to BAMAAPP');
    this.loadStoredUsername();
  }

  /**
   * Initialize reactive form
   */
  private initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required, Validators.minLength(4)]],
    });
  }

  /**
   * Initialize push notifications (only on native platforms)
   */
  private async initializePushNotifications(): Promise<void> {
    // Only initialize on native platforms
    if (!this.platform.is('capacitor')) {
      this.logService.info('Push notifications not available on web platform');
      return;
    }

    try {
      // Check and request permissions
      const permissionStatus = await PushNotifications.checkPermissions();

      if (permissionStatus.receive === 'prompt') {
        const newPermissionStatus =
          await PushNotifications.requestPermissions();
        if (newPermissionStatus.receive !== 'granted') {
          this.logService.warn('Push notification permissions denied');
          return;
        }
      } else if (permissionStatus.receive !== 'granted') {
        this.logService.warn('Push notification permissions not granted');
        return;
      }

      // Register for push notifications
      await PushNotifications.register();

      // Listen for registration
      PushNotifications.addListener('registration', (token) => {
        this.registerHandle = token.value;
        this.logService.info('Push registration successful');
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error) => {
        this.logService.error(error, 'Push registration failed');
      });

      // Listen for incoming notifications
      PushNotifications.addListener(
        'pushNotificationReceived',
        (notification) => {
          this.logService.info('Push notification received', notification);
        }
      );

      // Listen for notification actions
      PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification) => {
          this.logService.info(
            'Push notification action performed',
            notification
          );
        }
      );

      // Create notification channel for Android
      if (this.platform.is('android')) {
        await this.createNotificationChannel();
      }
    } catch (error) {
      this.logService.error(error, 'Failed to initialize push notifications');
    }
  }

  /**
   * Create notification channel for Android
   */
  private async createNotificationChannel(): Promise<void> {
    try {
      // Note: Capacitor 7 doesn't have createChannel method in PushNotifications
      // This would need to be implemented with a custom plugin or handled differently
      this.logService.info('Notification channel setup completed');
    } catch (error) {
      this.logService.error(error, 'Failed to create notification channel');
    }
  }

  /**
   * Load stored username for auto-fill
   */
  private async loadStoredUsername(): Promise<void> {
    try {
      const storedUsername = await this.authService.getStoredUsername();
      if (storedUsername) {
        this.loginForm.patchValue({ username: storedUsername });
      }
    } catch (error) {
      this.logService.error(error, 'Failed to load stored username');
    }
  }

  /**
   * Handle form submission
   */
  async onLogin(): Promise<void> {
    if (this.loginForm.invalid || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.hideAlerts();

    try {
      const formValue = this.loginForm.value;

      const credentials: LoginCredentials = {
        username: formValue.username,
        password: formValue.password,
        registerHandle: this.registerHandle,
      };

      this.logService.info(`Login attempt for user: ${credentials.username}`);

      const success = await this.authService.login(credentials);

      if (success) {
        // Set user context for logging
        this.logService.setUser(credentials.username);

        // Navigate to home page
        //this.router.navigate(['/home']);
        await this.navigateAfterSuccessfulLogin();

        this.logService.info('Login successful, navigating to home');
      } else {
        // Login failed
        this.incorrectPasswordAlert.set(true);
        this.logService.warn('Login failed - invalid credentials');
      }
    } catch (error: any) {
      this.logService.error(error, 'Login error occurred');

      // Handle specific error cases for .NET ASMX services
      if (error.status === 200 && error.error?.text?.includes('<!DOCTYPE')) {
        // Server returned HTML instead of JSON
        this.serverAccessErrorAlert.set(true);
        this.serverAccessErrorDetails.set(
          'שגיאת תצורה בשרת - נא לפנות למנהל המערכת'
        );
      } else if (error.status === 419) {
        // Auth expired
        this.serverAccessErrorAlert.set(true);
        this.serverAccessErrorDetails.set('תוקף הפעלה פג. אנא התחבר מחדש');
      } else if (error.status === 0) {
        // Network error
        this.serverAccessErrorAlert.set(true);
        this.serverAccessErrorDetails.set(
          'שגיאת רשת - בדוק את החיבור לאינטרנט'
        );
      } else if (error.status >= 500) {
        // Server error
        this.serverAccessErrorAlert.set(true);
        this.serverAccessErrorDetails.set('שגיאת שרת - נסה שוב מאוחר יותר');
      } else {
        // Other errors
        this.serverAccessErrorAlert.set(true);
        const errorMessage = `שגיאת שרת ${error.status}: ${
          error.statusText || 'שגיאה לא ידועה'
        }`;
        this.serverAccessErrorDetails.set(errorMessage);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Navigate after successful login based on policy acceptance
   */
  private async navigateAfterSuccessfulLogin(): Promise<void> {
    try {
      // Check if user has accepted policy
      const hasAcceptedPolicy = await this.policyService.ifAcceptedUserPolicy();

      if (hasAcceptedPolicy) {
        // Policy accepted - go to home page
        this.logService.info('User policy accepted - navigating to home');
        this.router.navigate(['/home'], { replaceUrl: true });
      } else {
        // Policy not accepted - go to policy page
        this.logService.info(
          'User policy not accepted - navigating to policy page'
        );
        this.router.navigate(['/auth/accept-policy'], { replaceUrl: true });
      }
    } catch (error: any) {
      this.logService.error(error, 'Navigation after login failed');
      // Fallback to policy page
      this.router.navigate(['/auth/accept-policy'], { replaceUrl: true });
    }
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword.update((current) => !current);
  }

  /**
   * Hide all alerts
   */
  private hideAlerts(): void {
    this.incorrectPasswordAlert.set(false);
    this.serverAccessErrorAlert.set(false);
    this.serverAccessErrorDetails.set('');
  }

  /**
   * Check if form is valid
   */
  get isFormValid(): boolean {
    return this.loginForm.valid;
  }

  /**
   * Get password input type
   */
  get passwordInputType(): string {
    return this.showPassword() ? 'text' : 'password';
  }

  /**
   * Get password toggle icon
   */
  get passwordToggleIcon(): string {
    return this.showPassword() ? 'eye-off' : 'eye';
  }
}
