import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root',
})
export class ApiTestService {
  private http = inject(HttpClient);
  private logService = inject(LogService);

  /**
   * Test API connectivity and response format
   */
  async testApiConnectivity(): Promise<void> {
    const testUrl = `${environment.baseUrl}LoginService.asmx/Login`;

    this.logService.info('Testing API connectivity...', { url: testUrl });

    try {
      // Test 1: Basic connectivity
      this.logService.info('Test 1: Basic HTTP request...');

      const headers = new HttpHeaders({
        authority: 'bamarcws112',
        method: 'POST',
        path: '/NGCS.Mobile.Web/LoginService.asmx/Login',
        scheme: 'https',
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9,he-IL;q=0.8,he;q=0.7',
        'Content-Type': 'application/json',
        'Sec-Ch-Ua':
          '"Chromium";v="136", "Android WebView";v="136", "Not.A/Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"Android"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 12; SM-G975F Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/136.0.7103.125 Mobile Safari/537.36',
        'X-Requested-With': 'il.gov.court.mobile',
      });

      const testData = {
        username: 'test',
        password: 'test',
        registerHandle: '',
        DeviceOp: 'web',
        DeviceOpVersion: '1.0',
        AppVersion: environment.appVersion,
      };

      this.logService.info('TEST DATA :', testData);

      const response = await firstValueFrom(
        this.http.post(testUrl, testData, {
          headers,
          withCredentials: true,
          responseType: 'text', // Get raw response
        })
      );

      this.logService.info('Raw API response:', response);

      // Check if response is HTML or JSON
      if (
        response.trim().startsWith('<!DOCTYPE') ||
        response.trim().startsWith('<html')
      ) {
        this.logService.error(
          'Server returned HTML instead of JSON',
          response.substring(0, 200)
        );
        throw new Error(
          'Server configuration error - returning HTML instead of JSON'
        );
      }

      // Try to parse as JSON
      try {
        const jsonResponse = JSON.parse(response);
        this.logService.info('Parsed JSON response:', jsonResponse);
      } catch (parseError) {
        this.logService.error(parseError, 'Failed to parse response as JSON');
        throw new Error('Invalid JSON response from server');
      }
    } catch (error: any) {
      this.logService.error(error, 'API connectivity test failed');

      if (error.status === 0) {
        this.logService.error(error, 'CORS or network error detected');
      } else if (
        error.status === 200 &&
        error.error?.text?.includes('<!DOCTYPE')
      ) {
        this.logService.error(
          error,
          'Server returned HTML instead of JSON - possible CORS or routing issue'
        );
      }

      throw error;
    }
  }

  /**
   * Test different request formats
   */
  async testRequestFormats(): Promise<void> {
    const testUrl = `${environment.baseUrl}LoginService.asmx/Login`;

    // Test different Content-Type headers
    const contentTypes = [
      'application/json',
      'application/json; charset=utf-8',
      'application/x-www-form-urlencoded',
      'text/plain',
    ];

    for (const contentType of contentTypes) {
      try {
        this.logService.info(`Testing Content-Type: ${contentType}`);

        const headers = new HttpHeaders({
          'Content-Type': contentType,
          Accept: 'application/json',
        });

        const testData = contentType.includes('form-urlencoded')
          ? 'username=test&password=test&registerHandle=&DeviceOp=web&DeviceOpVersion=1.0&AppVersion=' +
            environment.appVersion
          : JSON.stringify({
              username: 'test',
              password: 'test',
              registerHandle: '',
              DeviceOp: 'web',
              DeviceOpVersion: '1.0',
              AppVersion: environment.appVersion,
            });

        const response = await firstValueFrom(
          this.http.post(testUrl, testData, {
            headers,
            withCredentials: true,
            responseType: 'text',
          })
        );

        this.logService.info(
          `Success with Content-Type ${contentType}:`,
          response.substring(0, 100)
        );
      } catch (error) {
        this.logService.warn(`Failed with Content-Type ${contentType}:`, error);
      }
    }
  }

  /**
   * Test SOAP request (if needed for legacy ASMX)
   */
  async testSoapRequest(): Promise<void> {
    const testUrl = `${environment.baseUrl}LoginService.asmx`;

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Login xmlns="http://tempuri.org/">
      <username>test</username>
      <password>test</password>
      <registerHandle></registerHandle>
      <DeviceOp>web</DeviceOp>
      <DeviceOpVersion>1.0</DeviceOpVersion>
      <AppVersion>${environment.appVersion}</AppVersion>
    </Login>
  </soap:Body>
</soap:Envelope>`;

    try {
      this.logService.info('Testing SOAP request...');

      const headers = new HttpHeaders({
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'http://tempuri.org/Login',
      });

      const response = await firstValueFrom(
        this.http.post(testUrl, soapEnvelope, {
          headers,
          withCredentials: true,
          responseType: 'text',
        })
      );

      this.logService.info('SOAP response:', response);
    } catch (error) {
      this.logService.warn('SOAP request failed:', error);
    }
  }

  async testDirectFetch(): Promise<void> {
    try {
      this.logService.info('Testing with native fetch...');

      const response = await fetch(
        `${environment.baseUrl}LoginService.asmx/Login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            username: 'test-fetch',
            password: 'test-fetch',
            registerHandle: '',
            DeviceOp: 'web',
            DeviceOpVersion: '1.0',
            AppVersion: environment.appVersion,
          }),
          credentials: 'include',
        }
      );

      const text = await response.text();
      this.logService.info('Direct fetch response:', text);
    } catch (error) {
      this.logService.error(error, 'Direct fetch failed');
    }
  }
}
