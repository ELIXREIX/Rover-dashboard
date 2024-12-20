import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    const token = localStorage.getItem('token');
    console.log('LoginGuard: Checking token:', !!token);
    
    if (token) {
      console.log('LoginGuard: Token found, redirecting to welcome');
      return this.router.createUrlTree(['/welcome']);
    }

    console.log('LoginGuard: No token found, allowing access to login');
    return true;
  }
} 