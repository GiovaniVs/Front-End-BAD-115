import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { LoginRequest } from '../models/auth/login-request.model';
import { LoginResponse } from '../models/auth/login-response.model';
import { RegisterRequest } from '../models/auth/register-request.model';
import { UserRole } from '../models/auth/user-role.model';

export interface AuthUserAccount {
  idUsuario?: number;
  id_usuario?: number;
  idEncuestado?: number;
  id_encuestado?: number;
  idRol?: number;
  id_rol?: number;
  username?: string;
  nombres?: string;
  apellidos?: string;
  password?: string;
  correo?: string;
  correoElectronico?: string;
  correo_electronico?: string;
  fechaNacimiento?: string;
  fecha_nacimiento?: string;
  debeCambiarPass?: boolean | number;
  debe_cambiar_pass?: boolean | number;
  estado?: string;
  nombreRol?: string;
  nombre_rol?: string;
  rol?: {
    idRol?: number;
    id_rol?: number;
    id?: number;
    nombreRol?: string;
    nombre_rol?: string;
    nombre?: string;
  };
}

interface UsersResponseWrapper {
  data?: AuthUserAccount[];
  content?: AuthUserAccount[];
  usuarios?: AuthUserAccount[];
  encuestados?: AuthUserAccount[];
  totalElements?: number;
  total_pages?: number;
  totalPages?: number;
  number?: number;
  page?: number;
  size?: number;
}

export interface PaginatedUsersResult {
  users: AuthUserAccount[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly baseUrl = `${this.apiUrl}/auth`;
  private readonly usersUrl = `${this.apiUrl}/usuarios`;
  private readonly respondentsUrl = `${this.apiUrl}/encuestados`;

  loginByRole(role: UserRole, email: string, password: string): Observable<LoginResponse> {
    const payload: LoginRequest = { email, password, role };
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, payload, { withCredentials: true });
  }

  loginAdmin(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, { username, password }, { withCredentials: true });
  }

  register(payload: RegisterRequest): Observable<unknown> {
    return this.http.post<unknown>(this.usersUrl, payload);
  }

  getUsers(token?: string): Observable<AuthUserAccount[]> {
    const options = {
      ...(token ? { headers: this.getAuthHeaders(token) } : {}),
      withCredentials: !token
    };
    return this.http.get<AuthUserAccount[] | UsersResponseWrapper>(this.usersUrl, options).pipe(
      map((response) => this.normalizeUsersResponse(response))
    );
  }

  getUsersPage(token: string | undefined, page: number, size: number, roleId?: number): Observable<PaginatedUsersResult> {
    return this.http.get<AuthUserAccount[] | UsersResponseWrapper>(this.usersUrl, this.getPagedOptions(token, page, size, roleId)).pipe(
      map((response) => this.normalizePaginatedUsersResponse(response, page, size))
    );
  }

  getRespondentsPage(token: string | undefined, page: number, size: number): Observable<PaginatedUsersResult> {
    return this.http.get<AuthUserAccount[] | UsersResponseWrapper>(this.respondentsUrl, this.getPagedOptions(token, page, size)).pipe(
      map((response) => this.normalizePaginatedUsersResponse(response, page, size))
    );
  }

  private getPagedOptions(token: string | undefined, page: number, size: number, roleId?: number): { headers?: HttpHeaders; params: HttpParams; withCredentials: boolean } {
    let params = new HttpParams().set('page', page).set('size', size);
    if (roleId) {
      params = params.set('idRol', roleId).set('id_rol', roleId);
    }

    return {
      headers: token ? this.getAuthHeaders(token) : undefined,
      params,
      withCredentials: !token
    };
  }

  private getAuthHeaders(token: string): HttpHeaders {
    const authorization = token.startsWith('Basic ') || token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    return new HttpHeaders({ Authorization: authorization });
  }

  private normalizeUsersResponse(response: AuthUserAccount[] | UsersResponseWrapper): AuthUserAccount[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.data || response.content || response.usuarios || response.encuestados || [];
  }

  private normalizePaginatedUsersResponse(response: AuthUserAccount[] | UsersResponseWrapper, page: number, size: number): PaginatedUsersResult {
    const users = this.normalizeUsersResponse(response);
    if (Array.isArray(response)) {
      return {
        users,
        page,
        size,
        totalElements: users.length,
        totalPages: users.length > 0 ? Math.ceil(users.length / size) : 1
      };
    }

    return {
      users,
      page: response.number ?? response.page ?? page,
      size: response.size ?? size,
      totalElements: response.totalElements ?? users.length,
      totalPages: response.totalPages ?? response.total_pages ?? (users.length > 0 ? Math.ceil(users.length / size) : 1)
    };
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
