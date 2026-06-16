import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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

    if (!this.tokenSent) {
      this.authService.requestRespondentToken(email).subscribe({
        next: (message) => {
          this.tokenSent = true;
          this.message = message;
          this.loginForm.controls.token.setValidators([Validators.required, Validators.minLength(4)]);
          this.loginForm.controls.token.updateValueAndValidity();
          this.isLoading = false;
        },
        error: () => {
          this.loginForm.controls.email.setErrors({ loginError: true });
          this.isLoading = false;
        }
      });
      return;
    }

    if (this.loginForm.controls.token.invalid) {
      this.loginForm.controls.token.markAsTouched();
      this.isLoading = false;
      return;
    }

    this.authService.verifyRespondentToken(email, token).subscribe({
      next: (respondent) => {
        localStorage.setItem('respondent_email', email);
        localStorage.setItem('respondent_data', JSON.stringify(respondent));
        localStorage.setItem('user_role', 'ENCUESTADO');
        this.router.navigateByUrl('/encuestado/inicio');
        this.isLoading = false;
      },
      error: () => {
        this.loginForm.controls.token.setErrors({ invalidToken: true });
        this.isLoading = false;
      }
    });
  }
}
