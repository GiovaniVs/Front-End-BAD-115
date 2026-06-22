import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-respondent-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './respondent-login-page.html',
  styleUrl: './respondent-login-page.css'
})
export class RespondentLoginPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  tokenSent = false;
  isLoading = false;
  message = '';
  loginError = '';

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    token: ['']
  });

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, token } = this.loginForm.getRawValue();
    this.isLoading = true;
    this.message = '';
    this.loginError = '';

    if (!this.tokenSent) {
      this.authService.requestRespondentToken(email).pipe(
        timeout(20000),
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: (message) => {
          this.tokenSent = true;
          this.message = message;
          this.loginForm.controls.token.setValidators([Validators.required, Validators.minLength(4)]);
          this.loginForm.controls.token.updateValueAndValidity();
        },
        error: (error) => {
          this.loginForm.controls.email.setErrors({ loginError: true });
          this.loginError = this.getLoginErrorMessage(error);
        }
      });
      return;
    }

    if (this.loginForm.controls.token.invalid) {
      this.loginForm.controls.token.markAsTouched();
      this.isLoading = false;
      return;
    }

    this.authService.verifyRespondentToken(email, token).pipe(
      timeout(15000),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (respondent) => {
        localStorage.setItem('respondent_email', email);
        localStorage.setItem('respondent_data', JSON.stringify(respondent));
        localStorage.setItem('user_role', 'ENCUESTADO');
        this.router.navigateByUrl('/encuestado/inicio');
      },
      error: () => {
        this.loginForm.controls.token.setErrors({ invalidToken: true });
      }
    });
  }

  private getLoginErrorMessage(error: unknown): string {
    const status = (error as { status?: number })?.status;

    if ((error as { name?: string })?.name === 'TimeoutError') {
      return 'El servidor no termino de enviar el codigo. Revisa la configuracion SMTP/correo del backend en Railway.';
    }

    if (status === 0) {
      return 'No se pudo conectar con el backend. Revisa CORS o que la API este activa.';
    }

    if (status && status >= 500) {
      return 'El backend tuvo un error enviando el codigo. Revisa los logs de Railway.';
    }

    return 'No se pudo enviar el codigo. Verifica el correo.';
  }
}
