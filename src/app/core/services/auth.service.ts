import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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
  private apiUrl = '/api/login';

  constructor(private http: HttpClient) { }

  login(username: string, password: string): Observable<LoginResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    const requestBody = {
      body: JSON.stringify({
        Username: username,
        Password: password
      })
    };

    return this.http.post<any>(this.apiUrl, requestBody, { headers }).pipe(
      map(response => {
        let parsedResponse: LoginResponse;
        
        if (typeof response.body === 'string') {
          try {
            const parsedBody = JSON.parse(response.body);
            parsedResponse = {
              success: response.statusCode === 200,
              message: parsedBody.message || 'Login successful',
              token: 'dummy-token',
              statusCode: response.statusCode
            };
          } catch (e) {
            throw new Error('Failed to parse response');
          }
        } else {
          parsedResponse = {
            success: response.statusCode === 200,
            message: response.message || 'Login successful',
            token: 'dummy-token',
            statusCode: response.statusCode
          };
        }
        
        if (!parsedResponse.success) {
          throw new Error(parsedResponse.message || 'Login failed');
        }
        
        return parsedResponse;
      }),
      catchError((error: HttpErrorResponse | Error) => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }
} 