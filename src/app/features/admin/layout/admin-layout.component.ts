import { Component } from '@angular/core';
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
export class AdminLayoutComponent {
  isCollapsed = false;

  readonly menuItems: SidebarItem[] = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Encuestas', route: '/admin/encuestas', icon: 'surveys' },
    { label: 'Usuarios', route: '/admin/usuarios', icon: 'users' },
    { label: 'Roles', route: '/admin/roles', icon: 'roles' },
    { label: 'Encuestados', route: '/admin/encuestados', icon: 'respondents' },
    { label: 'Analitica', route: '/admin/analitica', icon: 'analytics' },
    { label: 'Reportes', route: '/admin/reportes', icon: 'reports' }
  ];

  constructor(private readonly router: Router) {}

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    this.router.navigateByUrl('/auth/admin-login');
  }
}
