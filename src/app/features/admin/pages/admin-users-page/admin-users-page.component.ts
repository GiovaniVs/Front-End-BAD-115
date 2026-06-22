import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, Subscription, timeout } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { AuthService, AuthUserAccount, PaginatedUsersResult } from '../../../../core/services/auth.service';

interface ManagedUserGroup {
  title: string;
  description: string;
  role: string;
  count: number;
}

type UsersSection = 'usuarios' | 'administradores' | 'disenadores' | 'encuestados';

@Component({
  selector: 'app-admin-users-page',
  templateUrl: './admin-users-page.component.html',
  styleUrl: './admin-users-page.component.css'
})
export class AdminUsersPageComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private routerSubscription?: Subscription;
  private usersRequestSubscription?: Subscription;

  users: AuthUserAccount[] = [];
  isLoading = false;
  loadError = '';
  currentSection: UsersSection = 'usuarios';
  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 1;

  get sectionTitle(): string {
    if (this.currentSection === 'administradores') {
      return 'Administradores';
    }

    if (this.currentSection === 'disenadores') {
      return 'Disenadores';
    }

    if (this.currentSection === 'encuestados') {
      return 'Encuestados';
    }

    return 'Gestion de usuarios';
  }

  get sectionDescription(): string {
    if (this.currentSection === 'administradores') {
      return 'Listado paginado de usuarios con rol de administrador.';
    }

    if (this.currentSection === 'disenadores') {
      return 'Listado paginado de usuarios con rol de disenador.';
    }

    if (this.currentSection === 'encuestados') {
      return 'Listado paginado de usuarios encuestados.';
    }

    return 'Listado paginado de administradores y disenadores del sistema.';
  }

  get visibleUsers(): AuthUserAccount[] {
    if (this.currentSection === 'administradores') {
      return this.users.filter((user) => this.getRoleId(user) === 1);
    }

    if (this.currentSection === 'disenadores') {
      return this.users.filter((user) => this.getRoleId(user) === 2);
    }

    return this.users;
  }

  get canGoPrevious(): boolean {
    return this.page > 0 && !this.isLoading;
  }

  get canGoNext(): boolean {
    return this.page + 1 < this.totalPages && !this.isLoading;
  }

  get currentEndpoint(): string {
    return this.currentSection === 'encuestados'
      ? `${environment.apiUrl}/encuestados`
      : `${environment.apiUrl}/usuarios`;
  }

  get userGroups(): ManagedUserGroup[] {
    return [
      {
        title: 'Administradores',
        description: 'Usuarios con privilegios para gestionar cuentas y accesos del sistema.',
        role: 'Rol ID 1',
        count: this.users.filter((user) => this.getRoleId(user) === 1).length
      },
      {
        title: 'Disenadores',
        description: 'Usuarios con privilegios para crear encuestas, preguntas y revisar resultados.',
        role: 'Rol ID 2',
        count: this.users.filter((user) => this.getRoleId(user) === 2).length
      }
    ];
  }

  ngOnInit(): void {
    this.currentSection = this.getSectionFromUrl();
    this.loadUsers();
    this.reloadInitialUsersSection();

    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(() => {
      const nextSection = this.getSectionFromUrl();
      if (nextSection !== this.currentSection) {
        this.currentSection = nextSection;
        this.page = 0;
        this.loadUsers();
      }
    });
  }

  private reloadInitialUsersSection(): void {
    setTimeout(() => {
      if (this.currentSection === 'usuarios' && this.users.length === 0) {
        this.loadUsers();
      }
    }, 300);
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    this.usersRequestSubscription?.unsubscribe();
  }

  loadUsers(): void {
    if (!this.isBrowser) {
      return;
    }

    const token = this.getStoredToken();
    if (!token) {
      this.users = [];
      this.isLoading = false;
      this.loadError = 'No hay una sesion activa. Inicia sesion nuevamente.';
      return;
    }

    this.isLoading = true;
    this.loadError = '';

    this.usersRequestSubscription?.unsubscribe();
    this.usersRequestSubscription = this.getUsersRequest(token).pipe(
      timeout(10000)
    ).subscribe({
      next: (response) => {
        this.setPaginatedResponse(response);
        this.isLoading = false;
        this.changeDetectorRef.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        if (this.isUnauthorizedError(error)) {
          this.clearStoredSession();
        }
        this.loadError = this.getLoadErrorMessage(error);
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  goToPreviousPage(): void {
    if (!this.canGoPrevious) {
      return;
    }

    this.page--;
    this.loadUsers();
  }

  goToNextPage(): void {
    if (!this.canGoNext) {
      return;
    }

    this.page++;
    this.loadUsers();
  }

  getUserId(user: AuthUserAccount): number | string {
    return user.idUsuario ?? user.id_usuario ?? user.idEncuestado ?? user.id_encuestado ?? '-';
  }

  getRoleId(user: AuthUserAccount): number | undefined {
    return user.idRol ?? user.id_rol ?? user.rol?.idRol ?? user.rol?.id_rol ?? user.rol?.id;
  }

  getRoleLabel(user: AuthUserAccount): string {
    if (this.currentSection === 'encuestados') {
      return 'Encuestado';
    }

    const roleId = this.getRoleId(user);
    if (roleId === 1) {
      return 'Administrador';
    }

    if (roleId === 2) {
      return 'Disenador';
    }

    return user.nombreRol || user.nombre_rol || user.rol?.nombreRol || user.rol?.nombre_rol || user.rol?.nombre || 'Sin rol';
  }

  getPasswordStatus(user: AuthUserAccount): string {
    if (this.currentSection === 'encuestados') {
      return '-';
    }

    const shouldChangePassword = user.debeCambiarPass ?? user.debe_cambiar_pass;
    return shouldChangePassword ? 'Debe cambiarla' : 'Actualizada';
  }

  getStatusLabel(user: AuthUserAccount): string {
    return user.estado === 'A' ? 'Activo' : user.estado || 'Sin estado';
  }

  getDisplayName(user: AuthUserAccount): string {
    const fullName = [user.nombres, user.apellidos].filter(Boolean).join(' ');
    return user.username || fullName || '-';
  }

  getEmail(user: AuthUserAccount): string {
    return user.correo || user.correoElectronico || user.correo_electronico || '-';
  }

  private getUsersRequest(token: string) {
    if (this.currentSection === 'encuestados') {
      return this.authService.getRespondentsPage(token, this.page, this.size);
    }

    return this.authService.getUsers(token).pipe(
      map((users) => {
        const filteredUsers = users.filter((user) => {
          if (this.currentSection === 'administradores') {
            return this.getRoleId(user) === 1;
          }

          if (this.currentSection === 'disenadores') {
            return this.getRoleId(user) === 2;
          }

          return true;
        });

        return {
          users: filteredUsers.slice(this.page * this.size, (this.page + 1) * this.size),
          page: this.page,
          size: this.size,
          totalElements: filteredUsers.length,
          totalPages: filteredUsers.length > 0 ? Math.ceil(filteredUsers.length / this.size) : 1
        };
      })
    );
  }

  private setPaginatedResponse(response: PaginatedUsersResult): void {
    this.users = response.users;
    this.page = response.page;
    this.size = response.size;
    this.totalElements = response.totalElements;
    this.totalPages = Math.max(response.totalPages, 1);
  }

  private getSectionFromUrl(): UsersSection {
    if (this.router.url.includes('/admin/administradores')) {
      return 'administradores';
    }

    if (this.router.url.includes('/admin/disenadores')) {
      return 'disenadores';
    }

    if (this.router.url.includes('/admin/encuestados')) {
      return 'encuestados';
    }

    return 'usuarios';
  }

  private getLoadErrorMessage(error: unknown): string {
    const status = (error as { status?: number })?.status;

    if (status === 0) {
      return 'No se pudo conectar con el backend. Revisa CORS o que el servidor este activo.';
    }

    if (status === 401 || status === 403) {
      return 'No tienes permisos para consultar usuarios o la sesion expiro.';
    }

    if ((error as { name?: string })?.name === 'TimeoutError') {
      return 'La consulta de usuarios tardo demasiado en responder.';
    }

    return 'No se pudo cargar la lista de usuarios.';
  }

  private getStoredToken(): string | undefined {
    const token = localStorage.getItem('auth_basic_token');
    return token && token !== 'undefined' ? token : undefined;
  }

  private isUnauthorizedError(error: unknown): boolean {
    const status = (error as { status?: number })?.status;
    return status === 401 || status === 403;
  }

  private clearStoredSession(): void {
    localStorage.removeItem('auth_basic_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_role_id');
    localStorage.removeItem('user_name');
  }
}
