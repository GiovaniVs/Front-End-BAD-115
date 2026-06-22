import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';

import { LoginResponse } from '../../../../core/models/auth/login-response.model';
import { AuthService } from '../../../../core/services/auth.service';

@Component ({
    selector: 'app-admin-login-page',
    imports: [ReactiveFormsModule, RouterLink], 
    templateUrl: './admin-login-page.html',
    styleUrl: './admin-login-page.css'
})
export class AdminLoginPageComponent{
    private readonly formBuilder = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    readonly loginForm = this.formBuilder.nonNullable.group({
        username: ['', [Validators.required, Validators.minLength(3)]], 
        password : ['', [Validators.required, Validators.minLength(6)]]
    })

    showPassword = false;
    isLoading = false;
    loginError = '';

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    onSubmit():void{
        if (this.isLoading) {
            return;
        }

        if(this.loginForm.invalid){
            this.loginForm.markAllAsTouched(); 
            return; 
        }
        const {username, password} = this.loginForm.getRawValue(); 
        this.isLoading = true;
        this.loginError = '';
        this.loginForm.controls.password.setErrors(null);

        this.authService.loginAdmin(username, password).pipe(
            timeout(15000),
            finalize(() => this.isLoading = false)
        ).subscribe({
            next:(response)=>{
                const roleId = this.getRoleId(response);
                const roleName = this.getRoleName(response, roleId);

                localStorage.setItem('auth_basic_token', this.getBasicAuthToken(username, password));

                if (response.token) {
                    localStorage.setItem('auth_token', response.token);
                } else {
                    localStorage.setItem('auth_token', this.getBasicAuthToken(username, password));
                }
                localStorage.setItem('user_role', roleName);
                if (roleId) {
                    localStorage.setItem('user_role_id', String(roleId));
                } else {
                    localStorage.removeItem('user_role_id');
                }
                localStorage.setItem('user_name', response.fullName || response.username || username);
                this.router.navigateByUrl(this.getHomeRoute(roleName, roleId));
            },
            error: (error) => {
              if (this.isInvalidCredentialsError(error)) {
                this.loginForm.controls.password.setErrors({ invalidCredentials: true });
                return;
              }

              this.loginError = this.getLoginErrorMessage(error);
            }
        }); 
    }

    private isInvalidCredentialsError(error: unknown): boolean {
        const status = (error as { status?: number })?.status;
        return status === 401 || status === 403;
    }

    private getLoginErrorMessage(error: unknown): string {
        const status = (error as { status?: number })?.status;

        if ((error as { name?: string })?.name === 'TimeoutError') {
            return 'El servidor tardo demasiado en responder. Intenta nuevamente.';
        }

        if (status === 0) {
            return 'No se pudo conectar con el backend. Revisa que la API este activa y que CORS permita este origen.';
        }

        if (status && status >= 500) {
            return 'El backend respondio con un error interno. Revisa la conexion del backend con PostgreSQL en Railway.';
        }

        return 'No se pudo iniciar sesion. Intenta nuevamente.';
    }

    private getRoleId(response: LoginResponse): number | undefined {
        const data = response as LoginResponse & {
            id_rol?: number | string;
            rol?: { idRol?: number | string; id_rol?: number | string; id?: number | string };
            usuario?: { rol?: { idRol?: number | string; id_rol?: number | string; id?: number | string } };
            user?: { rol?: { idRol?: number | string; id_rol?: number | string; id?: number | string } };
        };
        const tokenPayload = this.getTokenPayload(response.token);
        const tokenRole = tokenPayload as {
            idRol?: number | string;
            id_rol?: number | string;
            rol?: { idRol?: number | string; id_rol?: number | string; id?: number | string };
            role?: { idRol?: number | string; id_rol?: number | string; id?: number | string };
        } | undefined;

        return this.toNumber(
            data.idRol ??
            data.id_rol ??
            data.rol?.idRol ??
            data.rol?.id_rol ??
            data.rol?.id ??
            data.usuario?.rol?.idRol ??
            data.usuario?.rol?.id_rol ??
            data.usuario?.rol?.id ??
            data.user?.rol?.idRol ??
            data.user?.rol?.id_rol ??
            data.user?.rol?.id ??
            tokenRole?.idRol ??
            tokenRole?.id_rol ??
            tokenRole?.rol?.idRol ??
            tokenRole?.rol?.id_rol ??
            tokenRole?.rol?.id ??
            tokenRole?.role?.idRol ??
            tokenRole?.role?.id_rol ??
            tokenRole?.role?.id
        );
    }

    private getRoleName(response: LoginResponse, idRol: number | undefined): string {
        if (idRol === 2) {
            return 'DISENADOR';
        }

        if (idRol === 1) {
            return 'ADMINISTRADOR';
        }

        const data = response as LoginResponse & {
            rol?: { nombreRol?: string; nombre?: string; name?: string };
            usuario?: { rol?: { nombreRol?: string; nombre?: string; name?: string } };
            user?: { rol?: { nombreRol?: string; nombre?: string; name?: string } };
        };
        const tokenPayload = this.getTokenPayload(response.token);
        const tokenRole = tokenPayload as {
            role?: string | { nombreRol?: string; nombre?: string; name?: string };
            rol?: string | { nombreRol?: string; nombre?: string; name?: string };
            authorities?: string[];
        } | undefined;

        const roleName = this.firstText(
            response.role,
            data.rol?.nombreRol,
            data.rol?.nombre,
            data.rol?.name,
            data.usuario?.rol?.nombreRol,
            data.usuario?.rol?.nombre,
            data.usuario?.rol?.name,
            data.user?.rol?.nombreRol,
            data.user?.rol?.nombre,
            data.user?.rol?.name,
            typeof tokenRole?.role === 'string' ? tokenRole.role : tokenRole?.role?.nombreRol,
            typeof tokenRole?.role === 'string' ? undefined : tokenRole?.role?.nombre,
            typeof tokenRole?.role === 'string' ? undefined : tokenRole?.role?.name,
            typeof tokenRole?.rol === 'string' ? tokenRole.rol : tokenRole?.rol?.nombreRol,
            typeof tokenRole?.rol === 'string' ? undefined : tokenRole?.rol?.nombre,
            typeof tokenRole?.rol === 'string' ? undefined : tokenRole?.rol?.name,
            response.roles?.find((role) => this.normalizeRole(role.authority).includes('DISENADOR'))?.authority,
            response.roles?.find((role) => this.normalizeRole(role.authority).includes('ADMIN'))?.authority,
            tokenRole?.authorities?.[0]
        ) || 'ADMINISTRADOR';

        const normalizedRole = this.normalizeRole(roleName);
        if (normalizedRole.includes('DISENADOR') || normalizedRole.includes('DESIGNER')) {
            return 'DISENADOR';
        }

        if (normalizedRole.includes('ADMIN')) {
            return 'ADMINISTRADOR';
        }

        return roleName;
    }

    private getHomeRoute(role: string | undefined, idRol: number | undefined): string {
        const normalizedRole = this.normalizeRole(role);
        if (idRol === 2 || normalizedRole.includes('DISENADOR') || normalizedRole.includes('DESIGNER')) {
            return '/disenador/encuestas';
        }

        return '/admin/usuarios';
    }

    private getTokenPayload(token: string | undefined): Record<string, unknown> | undefined {
        const payload = token?.split('.')[1];
        if (!payload) {
            return undefined;
        }

        try {
            const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
            const paddedPayload = normalizedPayload.padEnd(normalizedPayload.length + (4 - normalizedPayload.length % 4) % 4, '=');
            return JSON.parse(atob(paddedPayload)) as Record<string, unknown>;
        } catch {
            return undefined;
        }
    }

    private normalizeRole(role: string | undefined): string {
        return (role || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();
    }

    private firstText(...values: unknown[]): string | undefined {
        const value = values.find((item) => typeof item === 'string' && item.trim().length > 0);
        return typeof value === 'string' ? value : undefined;
    }

    private toNumber(value: unknown): number | undefined {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? numericValue : undefined;
    }

    private getBasicAuthToken(username: string, password: string): string {
        return `Basic ${this.toBase64Utf8(`${username}:${password}`)}`;
    }

    private toBase64Utf8(value: string): string {
        const bytes = new TextEncoder().encode(value);
        const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
        return btoa(binary);
    }

}
