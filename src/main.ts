import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },

    // Ionic configuration
    provideIonicAngular({
      rippleEffect: true,
      mode: 'md',
      innerHTMLTemplatesEnabled: true,
    }),

    // Router configuration
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(),
  ],
}).catch((err) => console.error('Error starting app:', err));
