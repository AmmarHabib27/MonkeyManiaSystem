import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take, finalize } from 'rxjs/operators';
import { loginService } from 'src/app/auth/login.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment'; 

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(
    private authService: loginService,
    private toaster: ToastrService,
    private router: Router,
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    // Skip authentication for certain requests
    if (this.skipAuth(req)) {
      return next.handle(req);
    }

    // Add authentication headers
    const authReq = this.addAuthHeaders(req);

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // FIXED: Only handle 401 for authentication issues
        if (error.status === 401) {
          return this.handle401Error(authReq, next);
        }

        // FIXED: Handle 403 as permission error, NOT authentication error
        if (error.status === 403) {
          return this.handle403Error(error);
        }

        // Handle other errors
        return this.handleOtherErrors(error);
      }),
    );
  }

  private skipAuth(req: HttpRequest<any>): boolean {
    // Skip for assets
    const isAsset =
      req.url.includes('/assets/') ||
      req.url.startsWith('assets/') ||
      !!req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|json|html)$/);

    // Skip for auth endpoints to prevent infinite loops
    const isAuthEndpoint =
      req.url.includes('token/obtain') ||
      req.url.includes('token/refresh') ||
      req.url.includes('token/blacklist');

    return isAsset || isAuthEndpoint;
  }

  private addAuthHeaders(req: HttpRequest<any>): HttpRequest<any> {
    let headers = req.headers
      .set('Accept', 'application/json')
      .set('accept-language', 'ar');

    // Add Content-Type for POST/PUT requests
    if (
      ['POST', 'PUT', 'PATCH'].includes(req.method) &&
      !req.headers.has('Content-Type') &&
      !(req.body instanceof FormData)
    ) {
      headers = headers.set('Content-Type', 'application/json');
    }

    // Add Authorization header
    const token = this.authService.getAccessToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    // Ensure full URL
    let url = req.url;
    if (!url.startsWith('http')) {
      url = `${environment.apiUrl}${url.replace(/^\//, '')}`;
    }

    return req.clone({
      headers,
      url,
    });
  }

  // FIXED: Only handle 401 errors with token refresh
  private handle401Error(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((response: any) => {
          const newToken = response.access || response.access_token;
          this.refreshTokenSubject.next(newToken);

          // Retry original request with new token
          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newToken}`,
            },
          });

          return next.handle(retryReq);
        }),
        catchError((error) => {
          this.authService.logout();
          return throwError(() => error);
        }),
        finalize(() => {
          this.isRefreshing = false;
        }),
      );
    } else {
      // Wait for the refresh to complete
      return this.refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap((token) => {
          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          });
          return next.handle(retryReq);
        }),
      );
    }
  }

  // NEW: Proper 403 handling - NO LOGOUT
  private handle403Error(error: HttpErrorResponse): Observable<never> {
    // Check if this is a session timeout disguised as 403
    const errorMessage = error.error?.message || error.error?.detail || '';
    const isSessionTimeout =
      errorMessage.includes('session') ||
      errorMessage.includes('inactive') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('expired');

    if (isSessionTimeout) {
      // This is really a session timeout, handle like 401
      // But first check if we have a refresh token
      if (this.authService.getRefreshToken()) {
        // Try to refresh
        return this.authService.refreshToken().pipe(
          switchMap(() => {
            // Refresh successful, this shouldn't have been a 403
            return throwError(() => error);
          }),
          catchError(() => {
            this.authService.logout();
            return throwError(() => error);
          }),
        );
      } else {
        // No refresh token, just logout
        this.authService.logout();
      }
    } else {
      // This is a real permission error - show user-friendly message
      const message = this.getFriendly403Message(errorMessage);
      this.toaster.error(message);

      // Don't logout for permission errors
    }

    return throwError(() => error);
  }

  private getFriendly403Message(errorMessage: string): string {
    // Customize based on your app's needs
    // if (errorMessage.includes('permission')) {
    //   return "You don't have permission to access this resource";
    // }
    // if (errorMessage.includes('role')) {
    //   return "Your role doesn't allow this action";
    // }
    // if (errorMessage.includes('admin')) {
    //   return 'Admin access required';
    // }

    return errorMessage;
  }

  private handleOtherErrors(error: HttpErrorResponse): Observable<never> {
    let message = 'An error occurred';

    switch (error.status) {
      case 0:
        message =
          'Network connection error - please check your internet connection';
        break;
      case 400:
        message = error.error?.message || error.error?.detail || 'Bad request';
        break;
      case 404:
        message = 'The requested resource was not found';
        break;
      case 409:
        message = error.error?.message || 'Conflict occurred';
        break;
      case 422:
        message = this.extractValidationErrors(error.error);
        break;
      case 500:
        message = 'Server error - please try again later';
        break;
      case 502:
      case 503:
      case 504:
        message = 'Service temporarily unavailable - please try again later';
        break;
      default:
        message =
          error.error?.message ||
          error.error?.detail ||
          `Error ${error.status}: ${error.statusText}`;
    }

    // Show toast for errors (except 401 which is handled separately)
    if (error.status !== 401) {
      this.toaster.error(message);
    }

    return throwError(() => error);
  }

  private extractValidationErrors(errorObj: any): string {
    if (typeof errorObj === 'string') {
      return errorObj;
    }

    if (errorObj?.message) {
      return errorObj.message;
    }

    // Handle validation errors (common in Django REST framework)
    if (typeof errorObj === 'object') {
      const errors: string[] = [];

      Object.keys(errorObj).forEach((key) => {
        const value = errorObj[key];
        if (Array.isArray(value)) {
          errors.push(`${key}: ${value.join(', ')}`);
        } else if (typeof value === 'string') {
          errors.push(`${key}: ${value}`);
        }
      });

      return errors.length > 0
        ? errors.join('; ')
        : 'Validation error occurred';
    }

    return 'Validation error occurred';
  }
}
