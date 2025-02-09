import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private platformId = inject(PLATFORM_ID);

  constructor(private router: Router) {}

  canActivate(): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    // Check if we're in the browser
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      console.log('AuthGuard: Checking token:', !!token);
      
      if (!token) {
        console.log('AuthGuard: No token found, redirecting to login');
        return this.router.createUrlTree(['/login']);
      }

      console.log('AuthGuard: Token found, allowing access');
      return true;
    }

    // During SSR, allow access
    console.log('AuthGuard: SSR detected, allowing access');
    return true;
  }
}