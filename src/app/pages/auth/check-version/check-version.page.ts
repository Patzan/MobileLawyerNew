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
  IonHeader,
} from '@ionic/angular/standalone';

import {
  DataService,
  VersionCheckResponse,
} from '../../../core/services/data.service';

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
    IonHeader,
  ],
})
export class CheckVersionPage implements OnInit {
  // Inject services
  private dataService = inject(DataService);
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
      this.logService.info('Version check passed - navigating to login');
      this.router.navigate(['/auth/login'], { replaceUrl: true });
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
