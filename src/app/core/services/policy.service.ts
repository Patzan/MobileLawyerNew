import { Injectable, inject } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root',
})
export class PolicyService {
  private logService = inject(LogService);

  // Storage key for user policy acceptance
  private readonly STORAGE_KEY = 'AcceptedUserPolicyValue';

  constructor() {
    this.logService.info('PolicyService initialized');
  }

  /**
   * Check if user has accepted the user policy
   * Returns true if policy was accepted, false otherwise
   */
  async ifAcceptedUserPolicy(): Promise<boolean> {
    try {
      const result = await Preferences.get({ key: this.STORAGE_KEY });

      const isAccepted =
        result.value !== null &&
        result.value !== undefined &&
        result.value !== '' &&
        result.value === 'true';

      this.logService.info('User policy acceptance checked', {
        accepted: isAccepted,
      });

      return isAccepted;
    } catch (error: any) {
      this.logService.error(error, 'Failed to check user policy acceptance');
      return false;
    }
  }

  /**
   * Set user policy as accepted
   * Stores acceptance flag in device storage
   */
  async setAcceptedUserPolicy(): Promise<void> {
    try {
      await Preferences.set({
        key: this.STORAGE_KEY,
        value: 'true',
      });

      this.logService.info('User policy acceptance saved');
    } catch (error: any) {
      this.logService.error(error, 'Failed to save user policy acceptance');
      throw error;
    }
  }

  /**
   * Clear user policy acceptance
   * Used for testing or user logout
   */
  async clearAcceptedUserPolicy(): Promise<void> {
    try {
      await Preferences.remove({ key: this.STORAGE_KEY });

      this.logService.info('User policy acceptance cleared');
    } catch (error: any) {
      this.logService.error(error, 'Failed to clear user policy acceptance');
      throw error;
    }
  }

  /**
   * Get policy acceptance status as string for debugging
   */
  async getPolicyStatusString(): Promise<string> {
    try {
      const result = await Preferences.get({ key: this.STORAGE_KEY });
      return result.value || 'not set';
    } catch {
      return 'error reading';
    }
  }
}
