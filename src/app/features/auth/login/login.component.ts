import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService, LoginResponse } from '../../../core/services/auth.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    NzFormModule,
    NzInputModule,
    NzCheckboxModule,
    NzButtonModule,
    NzIconModule,
    HttpClientModule
  ],
  providers: [AuthService],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  rememberMe = false;
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private message: NzMessageService
  ) {}

  onSubmit(): void {
    if (!this.username || !this.password) {
      this.message.error('Please enter both username and password');
      return;
    }

    this.isLoading = true;
    this.authService.login(this.username, this.password).subscribe({
      next: (response: LoginResponse) => {
        this.isLoading = false;
        
        if (response.success) {
          // Store the token
          if (response.token) {
            localStorage.setItem('token', response.token);
          }
          
          // Show success message
          this.message.success(response.message);
          
          // Navigate to welcome page without page reload
          this.router.navigate(['/welcome']);
        } else {
          this.message.error(response.message || 'Login failed');
        }
      },
      error: (error: Error) => {
        this.isLoading = false;
        console.error('Login error:', error);
        this.message.error(error.message || 'Login failed');
      }
    });
  }
}
