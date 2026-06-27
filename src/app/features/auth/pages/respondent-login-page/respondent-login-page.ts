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

    const { token } = this.loginForm.getRawValue();
    const email = this.loginForm.controls.email.value.trim();
    this.loginForm.controls.email.setValue(email, { emitEvent: false });
    this.isLoading = true;
    this.message = '';
    this.loginError = '';

    if (!this.tokenSent) {
      this.authService.requestRespondentToken(email).pipe(
        timeout(90000),
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
    const backendMessage = this.getBackendErrorMessage(error);

    if ((error as { name?: string })?.name === 'TimeoutError') {
      return 'El servidor tardo demasiado enviando el codigo. Intenta de nuevo en unos minutos.';
    }

    if (status === 0) {
      return 'No se pudo conectar con el backend. Revisa CORS o que la API este activa.';
    }

    if (status === 404) {
      return 'No existe un encuestado registrado con ese correo.';
    }

    if (backendMessage) {
      return backendMessage;
    }

    if (status && status >= 500) {
      return 'El backend tuvo un error enviando el codigo. Revisa la configuracion SMTP/correo.';
    }

    return 'No se pudo enviar el codigo. Verifica el correo.';
  }

  private getBackendErrorMessage(error: unknown): string {
    const responseError = (error as { error?: unknown })?.error;
    if (typeof responseError === 'string') {
      return responseError;
    }

    if (responseError && typeof responseError === 'object') {
      const message = (responseError as { message?: unknown; error?: unknown })?.message ?? (responseError as { error?: unknown })?.error;
      return typeof message === 'string' ? message : '';
    }

    return '';
  }
}
