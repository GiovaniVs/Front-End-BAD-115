import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-respondent-layout',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './respondent-layout.component.html',
  styleUrl: './respondent-layout.component.css'
})
export class RespondentLayoutComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly router = inject(Router);

  readonly respondentEmail = this.isBrowser ? localStorage.getItem('respondent_email') || 'Participante' : 'Participante';
  readonly userRole = 'Encuestado';

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('respondent_email');
      localStorage.removeItem('respondent_data');
      localStorage.removeItem('user_role');
    }

    this.router.navigateByUrl('/auth/encuestado-login');
  }
}
