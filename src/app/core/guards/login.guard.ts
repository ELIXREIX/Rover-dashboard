import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  private platformId = inject(PLATFORM_ID);
  // Update API URL to include the correct endpoint
  private apiUrl = 'https://3nbdi5jfzf.execute-api.ap-southeast-1.amazonaws.com/Deploy';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      console.log('LoginGuard: Checking token:', !!token);

      if (!token) {
        console.log('LoginGuard: No token found, allowing access to login');
        return of(true);
      }

      // Use GET method instead of POST for status check
      return this.http.get<any>(this.apiUrl).pipe(
        map(response => {
          console.log('LoginGuard: Status check successful', response);
          return this.router.createUrlTree(['/monitor']);
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('LoginGuard: Status check failed', error);
          localStorage.removeItem('token');
          return of(true);
        })
      );
    }

    console.log('LoginGuard: SSR detected, allowing access to login');
    return of(true);
  }
}