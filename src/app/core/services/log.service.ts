import { Injectable } from '@angular/core';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEvent {
  level: string;
  message: string;
  timestamp: string;
  username?: string;
  error?: any;
  additionalData?: any;
}

@Injectable({
  providedIn: 'root',
})
export class LogService {
  private currentLogLevel: LogLevel = LogLevel.DEBUG; // Default to DEBUG for development
  private currentUsername: string = '';

  constructor() {
    // Simple console-based logging for now
    // Can be extended later if needed
  }

  /**
   * Log debug message
   */
  debug(message: string, additionalData?: any): void {
    this.log(LogLevel.DEBUG, message, null, additionalData);
  }

  /**
   * Log info message
   */
  info(message: string, additionalData?: any): void {
    this.log(LogLevel.INFO, message, null, additionalData);
  }

  /**
   * Log warning message
   */
  warn(message: string, additionalData?: any): void {
    this.log(LogLevel.WARN, message, null, additionalData);
  }

  /**
   * Log error message
   */
  error(error: any, message: string, additionalData?: any): void {
    this.log(LogLevel.ERROR, message, error, additionalData);
  }

  /**
   * Set current user for logging context
   */
  setUser(username: string): void {
    this.currentUsername = username;
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    this.currentUsername = '';
  }

  /**
   * Main logging method
   */
  private log(
    level: LogLevel,
    message: string,
    error?: any,
    additionalData?: any
  ): void {
    // Check if this log level should be processed
    if (level < this.currentLogLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];

    // Create log event
    const logEvent: LogEvent = {
      level: levelName,
      message,
      timestamp,
      username: this.currentUsername,
      error: error ? this.serializeError(error) : undefined,
      additionalData,
    };

    // Console logging only for now
    this.logToConsole(level, logEvent);
  }

  /**
   * Log to console with appropriate method
   */
  private logToConsole(level: LogLevel, logEvent: LogEvent): void {
    const consoleMessage = `[${logEvent.timestamp}] [${logEvent.level}] ${logEvent.message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(consoleMessage, logEvent.additionalData, logEvent.error);
        break;
      case LogLevel.INFO:
        console.info(consoleMessage, logEvent.additionalData);
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage, logEvent.additionalData);
        break;
      case LogLevel.ERROR:
        console.error(consoleMessage, logEvent.error, logEvent.additionalData);
        break;
    }
  }

  /**
   * Serialize error object for logging
   */
  private serializeError(error: any): any {
    if (!error) {
      return null;
    }

    // Handle different types of errors
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // Handle HTTP errors
    if (error.status !== undefined) {
      return {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        url: error.url,
        error: error.error,
      };
    }

    // Handle other types of errors
    if (typeof error === 'object') {
      try {
        return JSON.parse(JSON.stringify(error));
      } catch {
        return { error: 'Could not serialize error object' };
      }
    }

    return { error: error.toString() };
  }

  /**
   * Track custom event (for compatibility with old trackEvent method)
   */
  trackEvent(name: string, properties: any): void {
    // Simple console logging for compatibility
    this.info(`Event: ${name}`, properties);
  }

  /**
   * Get current username
   */
  getUserName(): string {
    return this.currentUsername;
  }
}
