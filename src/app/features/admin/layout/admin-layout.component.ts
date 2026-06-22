import { isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface SidebarItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly router = inject(Router);

  isCollapsed = false;
  readonly userName = this.isBrowser ? localStorage.getItem('user_name') || 'Usuario' : 'Usuario';
  readonly userRole = this.getStoredRole();
  readonly isDesignerPanel = this.router.url.startsWith('/disenador');
  readonly panelTitle = this.isDesignerPanel ? 'Panel de Diseno' : 'Panel de Administracion';
  readonly homeRoute = this.isDesignerPanel ? '/disenador/encuestas' : '/admin/usuarios';

  readonly menuItems: SidebarItem[] = this.isDesignerPanel
    ? [
        { label: 'Diseno de encuestas', route: '/disenador/encuestas', icon: 'surveys' },
        { label: 'Resultados', route: '/disenador/resultados', icon: 'analytics' }
      ]
    : [
        { label: 'Gestion de usuarios', route: '/admin/usuarios', icon: 'users' },
        { label: 'Administradores', route: '/admin/administradores', icon: 'roles' },
        { label: 'Disenadores', route: '/admin/disenadores', icon: 'roles' },
        { label: 'Encuestados', route: '/admin/encuestados', icon: 'respondents' }
      ];

  ngOnInit(): void {
    if (!this.isDesignerPanel && this.router.url === '/admin') {
      this.router.navigateByUrl('/admin/usuarios');
    }
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('auth_basic_token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_role_id');
      localStorage.removeItem('user_name');
    }
    this.router.navigateByUrl('/auth/admin-login');
  }

  private getStoredRole(): string {
    const defaultRole = this.router.url.startsWith('/disenador') ? 'Disenador' : 'Administrador';

    if (!this.isBrowser) {
      return defaultRole;
    }

    const role = localStorage.getItem('user_role');
    if (!role || role === 'undefined') {
      return defaultRole;
    }

    const normalizedRole = role.toUpperCase();
    if (normalizedRole === 'ADMIN' || normalizedRole.includes('ADMINISTRADOR')) {
      return 'Administrador';
    }

    if (normalizedRole.includes('DISENADOR')) {
      return 'Disenador';
    }

    return role;
  }
}
