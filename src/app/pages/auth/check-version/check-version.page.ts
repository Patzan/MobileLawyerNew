import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonButton,
  IonSpinner,
  AlertController,
  LoadingController,
} from '@ionic/angular/standalone';

import {
  DataService,
  VersionCheckResponse,
} from '../../../core/services/data.service';
import { PolicyService } from '../../../core/services/policy.service';
import { LogService } from '../../../core/services/log.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-check-version',
  templateUrl: './check-version.page.html',
  styleUrls: ['./check-version.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonSpinner,
  ],
})
export class CheckVersionPage implements OnInit {
  // Inject services
  private dataService = inject(DataService);
  private policyService = inject(PolicyService);
  private logService = inject(LogService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private loadingController = inject(LoadingController);

  // Component state
  isLoading = true;
  showIncompatibleAlert = false;
  showConnectionError = false;
  isCheckingVersion = false;

  constructor() {
    this.logService.info('CheckVersionPage initialized');
  }

  ngOnInit() {
    // Start version check after component initializes
    this.checkVersion();
  }

  /**
   * Main version checking logic
   */
  private async checkVersion(): Promise<void> {
    try {
      this.isLoading = true;
      this.hideAllAlerts();
      this.isCheckingVersion = true;

      this.logService.info('Starting version compatibility check');

      // Call server to get version information
      const versionData: VersionCheckResponse =
        await this.dataService.checkVersionCall();

      // Log version information
      this.logService.info('Server version data received', {
        serverVersion: versionData.ServerVersion,
        minCompatibleServerVersion: versionData.MinCompatibleServerVersion,
        currentClientVersion: environment.compatibleServerVersion,
      });

      // Check compatibility
      const isCompatible =
        environment.compatibleServerVersion >=
        versionData.MinCompatibleServerVersion;

      if (!isCompatible) {
        // Version incompatible - show error
        this.logService.warn('Server version incompatible', {
          clientVersion: environment.compatibleServerVersion,
          requiredMinVersion: versionData.MinCompatibleServerVersion,
        });

        this.showIncompatibleAlert = true;
        await this.showIncompatibleVersionAlert();
      } else {
        // Version compatible - proceed to next step
        this.logService.info(
          'Server version compatible - proceeding to navigation'
        );
        await this.navigateToNextPage();
      }
    } catch (error: any) {
      this.logService.error(error, 'Version check failed');

      // Show connection error
      this.showConnectionError = true;
      await this.showConnectionErrorAlert(error);
    } finally {
      this.isLoading = false;
      this.isCheckingVersion = false;
    }
  }

  /**
   * Navigate to next page based on policy acceptance
   */
  private async navigateToNextPage(): Promise<void> {
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
      this.logService.error(error, 'Navigation failed');
      // Fallback to login page
      this.router.navigate(['/auth/login'], { replaceUrl: true });
    }
  }

  /**
   * Show incompatible version alert
   */
  private async showIncompatibleVersionAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'עדכון נדרש',
      message: 'קיימת גרסת תוכנה חדשה, עליך לבצע תחילה עדכון תוכנה.',
      cssClass: 'rtl-alert',
      buttons: [
        {
          text: 'אישור',
          cssClass: 'alert-button-confirm',
        },
      ],
      backdropDismiss: false,
    });

    await alert.present();
  }

  /**
   * Show connection error alert
   */
  private async showConnectionErrorAlert(error: any): Promise<void> {
    let message = 'שגיאה בקבלת נתונים מהשרת';

    // Customize message based on error type
    if (error.message === 'NETWORK_ERROR') {
      message = 'בעיית רשת. בדוק את החיבור לאינטרנט ונסה שוב.';
    } else if (error.message === 'SERVER_ERROR') {
      message = 'שגיאת שרת. נסה שוב מאוחר יותר.';
    }

    const alert = await this.alertController.create({
      header: 'שגיאת חיבור',
      message,
      cssClass: 'rtl-alert',
      buttons: [
        {
          text: 'נסה שוב',
          cssClass: 'alert-button-confirm',
          handler: () => {
            this.retryVersionCheck();
          },
        },
      ],
      backdropDismiss: false,
    });

    await alert.present();
  }

  /**
   * Retry version check (public method for template)
   */
  retryVersionCheck(): void {
    this.logService.info('Retrying version check');
    this.checkVersion();
  }

  /**
   * Hide all alert states
   */
  private hideAllAlerts(): void {
    this.showIncompatibleAlert = false;
    this.showConnectionError = false;
  }
}
