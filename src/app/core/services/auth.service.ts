import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { LoginRequest } from '../models/auth/login-request.model';
import { LoginResponse } from '../models/auth/login-response.model';
import { RegisterRequest } from '../models/auth/register-request.model';
import { UserRole } from '../models/auth/user-role.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl =  'http://localhost:8083/api/auth';

  loginByRole(role: UserRole, email: string, password: string): Observable<LoginResponse> {
    const payload: LoginRequest = { email, password, role };
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, payload);
  }

  loginAdmin(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, { username, password });
  }

  register(payload: RegisterRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/register`, payload);
  }
}
