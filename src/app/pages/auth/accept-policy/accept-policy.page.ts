import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonCheckbox,
  IonItem,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonBackButton,
  IonButtons,
  IonIcon,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';

import { PolicyService } from '../../../core/services/policy.service';
import { LogService } from '../../../core/services/log.service';
import { ViewerModalComponent } from '@herdwatch/ngx-ionic-image-viewer';

@Component({
  selector: 'app-accept-policy',
  templateUrl: './accept-policy.page.html',
  styleUrls: ['./accept-policy.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonCheckbox,
    IonItem,
    IonLabel,
    IonGrid,
    IonRow,
    IonCol,
    IonList,
    IonBackButton,
    IonButtons,
    IonIcon,
    IonSpinner,
  ],
})
export class AcceptPolicyPage implements OnInit {
  // Inject services
  private policyService = inject(PolicyService);
  private logService = inject(LogService);
  private router = inject(Router);
  private modalController = inject(ModalController);

  // Component signals
  accept = signal(false);
  isSubmitting = signal(false);
  isAcceptUserPolicyPage = signal(false); // If user already accepted, hide checkbox
  isLoading = signal(true);

  constructor() {
    this.logService.info('AcceptPolicyPage initialized');
  }

  async ngOnInit() {
    await this.checkIfAlreadyAccepted();
  }

  /**
   * Check if user already accepted policy (affects UI display)
   */
  private async checkIfAlreadyAccepted(): Promise<void> {
    try {
      const hasAccepted = await this.policyService.ifAcceptedUserPolicy();
      this.isAcceptUserPolicyPage.set(hasAccepted);

      this.logService.info('Policy acceptance status checked', {
        hasAccepted,
      });
    } catch (error: any) {
      this.logService.error(error, 'Failed to check policy acceptance status');
      this.isAcceptUserPolicyPage.set(false);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Handle policy acceptance and navigation to HomePage
   * Matches old implementation: this.navCtrl.setRoot(HomePage)
   */
  async goToHomePage(): Promise<void> {
    if (!this.accept() && !this.isAcceptUserPolicyPage()) {
      return;
    }

    try {
      this.isSubmitting.set(true);
      this.logService.info('User accepting policy and navigating to home');

      // Save policy acceptance if not already accepted
      if (!this.isAcceptUserPolicyPage()) {
        await this.policyService.setAcceptedUserPolicy();
      }

      this.logService.info('Policy accepted - navigating to home page');

      // Navigate to home page (replaceUrl = true matches setRoot behavior)
      this.router.navigate(['/home'], { replaceUrl: true });
    } catch (error: any) {
      this.logService.error(error, 'Failed to save policy acceptance');

      // Continue anyway to avoid blocking user (matches old behavior)
      this.router.navigate(['/home'], { replaceUrl: true });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Present image in fullscreen viewer
   * Uses modern @herdwatch-apps/ngx-ionic-image-viewer (replaces ionic-img-viewer)
   * API matches old ionic-img-viewer usage
   */
  async presentImage(): Promise<void> {
    try {
      this.logService.info('Opening privacy policy image viewer');

      const modal = await this.modalController.create({
        component: ViewerModalComponent,
        componentProps: {
          src: 'assets/privacypolicy.png',
        },
        cssClass: 'ion-img-viewer',
        keyboardClose: true,
        showBackdrop: true,
      });

      await modal.present();

      this.logService.info('Privacy policy image viewer opened successfully');
    } catch (error: any) {
      this.logService.error(
        error,
        'Failed to open privacy policy image viewer'
      );
    }
  }

  /**
   * Handle image load error
   */
  onImageError(event: any): void {
    this.logService.warn('Failed to load privacy policy image', {
      src: event.target?.src,
      error: event,
    });
  }

  /**
   * Handle checkbox change
   */
  onCheckboxChange(event: any): void {
    this.accept.set(event.detail.checked);
    this.logService.info('Policy checkbox changed', {
      accepted: this.accept(),
    });
  }

  /**
   * Get continue button text
   */
  get continueButtonText(): string {
    return this.isSubmitting() ? 'שומר...' : 'המשך';
  }

  /**
   * Check if continue button should be disabled
   */
  get isContinueDisabled(): boolean {
    return (
      (!this.accept() && !this.isAcceptUserPolicyPage()) || this.isSubmitting()
    );
  }
}
