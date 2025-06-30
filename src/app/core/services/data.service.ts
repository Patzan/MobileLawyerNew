import { Injectable, inject } from '@angular/core';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { environment } from '../../../environments/environment';
import { LogService } from './log.service';

export interface VersionCheckResponse {
  ServerVersion: string;
  MinCompatibleServerVersion: number;
}

export interface ApiResponse<T> {
  d: T; // .NET ASMX services return data in 'd' property
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private logService = inject(LogService);

  constructor() {
    this.logService.info('DataService initialized');
  }

  /**
   * Check server version compatibility
   * Calls ServerVersionService.asmx/GetVersion endpoint
   */
  async checkVersionCall(): Promise<VersionCheckResponse> {
    try {
      this.logService.info('Checking server version compatibility');

      const url = `${environment.baseUrl}ServerVersionService.asmx/GetVersion`;

      const options = {
        url,
        method: 'POST' as const,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {}, // Empty data object as required by old API
      };

      const response: HttpResponse = await CapacitorHttp.request(options);

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.data}`);
      }

      // Parse response - old .NET ASMX returns data in 'd' property
      let responseData: ApiResponse<VersionCheckResponse>;

      if (typeof response.data === 'string') {
        responseData = JSON.parse(response.data);
      } else {
        responseData = response.data;
      }

      if (!responseData.d) {
        throw new Error('Invalid response format from server');
      }

      const versionData = responseData.d;

      this.logService.info('Server version check completed', {
        serverVersion: versionData.ServerVersion,
        minCompatibleVersion: versionData.MinCompatibleServerVersion,
      });

      return versionData;
    } catch (error: any) {
      this.logService.error(error, 'Failed to check server version');

      // Re-throw with more specific error information
      if (error.message?.includes('Network Error') || error.status === 0) {
        throw new Error('NETWORK_ERROR');
      } else if (error.status >= 500) {
        throw new Error('SERVER_ERROR');
      } else {
        throw error;
      }
    }
  }

  /**
   * Get unread message counts for home page badges
   * This method is used by HomePage - included for future use
   */
  async getUnreadNumbersFromServer(): Promise<number[]> {
    try {
      const url = `${environment.baseUrl}mDataProvider.asmx/GetUnreadNumbers`;

      const options = {
        url,
        method: 'POST' as const,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {},
      };

      const response: HttpResponse = await CapacitorHttp.request(options);

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }

      let responseData: ApiResponse<number[]>;

      if (typeof response.data === 'string') {
        responseData = JSON.parse(response.data);
      } else {
        responseData = response.data;
      }

      return responseData.d || [];
    } catch (error: any) {
      this.logService.error(error, 'Failed to get unread numbers');
      throw error;
    }
  }
}
