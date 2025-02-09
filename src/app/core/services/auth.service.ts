import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map ,tap} from 'rxjs/operators';
import { environment } from '../../../environments/environment';


export interface LoginResponse {
  statusCode?: number;
  body?: string;
  message: string;
  token?: string;
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = environment.apiUrl;
    console.log(`[${environment.envName}] Environment Settings:`, {
      name: environment.envName, 
      production: environment.production,
      apiUrl: environment.apiUrl,
      fullUrl: `${environment.apiUrl}/login`
    });
  }

  login(username: string, password: string): Observable<LoginResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });
    // Format request body without extra nesting
    const requestBody = {
      body: JSON.stringify({
      Username: username,
      Password: password
    })
    };
    const loginUrl = `${this.apiUrl}/login`;
    console.log(`[${environment.envName}] Making API call to:`, loginUrl);


    return this.http.post<any>(loginUrl, requestBody, { headers, withCredentials: false }).pipe(
      tap(response => console.log('Raw response:', response)),
      map(response => {
        let parsedResponse: LoginResponse;
        try {
          const responseData = response.body ? JSON.parse(response.body) : response;


          // Create a dummy token since API doesn't provide one
          const token = btoa(`${username}:${new Date().getTime()}`);
          
          const parsedResponse: LoginResponse = {
            success: response.statusCode === 200 || responseData.statusCode === 200,
            message: responseData.message || 'Login successful',
            token: responseData.token || btoa(`${username}:${new Date().getTime()}`),
            statusCode: response.statusCode || responseData.statusCode || 200
          };

          if (parsedResponse.success) {
            localStorage.setItem('token', token);
            console.log('Token stored:', token);
          }

          return parsedResponse;
        } catch (e) {
          console.error('Response parsing error:', e);
          throw new Error('Invalid response format');
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Login error:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error
        });
        return throwError(() => new Error(error.message || 'Login failed'));
      })
    );
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
} 