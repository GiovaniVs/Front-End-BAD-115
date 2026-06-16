import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { LoginRequest } from '../models/auth/login-request.model';
import { LoginResponse } from '../models/auth/login-response.model';
import { RegisterRequest } from '../models/auth/register-request.model';
import { UserRole } from '../models/auth/user-role.model';

export interface AuthUserAccount {
  idRol?: number;
  id_rol?: number;
  username?: string;
  rol?: {
    idRol?: number;
    id_rol?: number;
    id?: number;
    nombreRol?: string;
    nombre_rol?: string;
    nombre?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl =  'http://localhost:8083/api/auth';
  private readonly usersUrl = 'http://localhost:8083/api/usuarios';
  private readonly respondentsUrl = 'http://localhost:8083/api/encuestados';

  loginByRole(role: UserRole, email: string, password: string): Observable<LoginResponse> {
    const payload: LoginRequest = { email, password, role };
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, payload);
  }

  loginAdmin(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, { username, password });
  }

  register(payload: RegisterRequest): Observable<unknown> {
    return this.http.post<unknown>(this.usersUrl, payload);
  }

  getUsers(token?: string): Observable<AuthUserAccount[]> {
    const options = token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : undefined;
    return this.http.get<AuthUserAccount[]>(this.usersUrl, options);
  }

  registerRespondent(payload: {
    nombres: string;
    apellidos: string;
    correoElectronico: string;
    fechaNacimiento: string;
  }): Observable<unknown> {
    return this.http.post<unknown>(`${this.respondentsUrl}/registro`, payload);
  }

  requestRespondentToken(correo: string): Observable<string> {
    return this.http.post(`${this.respondentsUrl}/login-encuestado`, null, {
      params: { correo },
      responseType: 'text'
    });
  }

  verifyRespondentToken(correo: string, token: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.respondentsUrl}/verificar-token`, null, {
      params: { correo, token }
    });
  }
}
