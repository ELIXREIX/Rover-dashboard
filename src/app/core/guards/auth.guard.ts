import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    const token = localStorage.getItem('token');
    console.log('AuthGuard: Checking token:', !!token);
    
    if (!token) {
      console.log('AuthGuard: No token found, redirecting to login');
      return this.router.createUrlTree(['/login']);
    }

    console.log('AuthGuard: Token found, allowing access');
    return true;
  }
}
