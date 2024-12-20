import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginGuard } from './core/guards/login.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/login' },
  { 
    path: 'login', 
    loadChildren: () => import('./features/auth/login/login.routes').then(m => m.LOGIN_ROUTES),
    canActivate: [LoginGuard]
  },
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { 
        path: 'welcome', 
        loadChildren: () => import('./features/dashboard/welcome/welcome.routes').then(m => m.WELCOME_ROUTES) 
      },
      { 
        path: 'monitor', 
        loadChildren: () => import('./features/dashboard/monitor/monitor.routes').then(m => m.MONITOR_ROUTES) 
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
