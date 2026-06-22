import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';

type AccountType = 'ENCUESTADO' | 'DISENADOR';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.html',
  styleUrl: './register-page.css'
})
export class RegisterPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly registerForm = this.formBuilder.nonNullable.group(
    {
      accountType: this.formBuilder.nonNullable.control<AccountType>('ENCUESTADO', [Validators.required]),
      nombres: ['', [Validators.required, Validators.minLength(2)]],
      apellidos: ['', [Validators.required, Validators.minLength(2)]],
      correoElectronico: ['', [Validators.required, Validators.email]],
      fechaNacimiento: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: this.passwordsMatch }
  );

  showPassword = false;
  showConfirmPassword = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    this.applyAccountValidators();

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { accountType, nombres, apellidos, correoElectronico, fechaNacimiento, username, correo, password } =
      this.registerForm.getRawValue();

    if (accountType === 'ENCUESTADO') {
      this.authService.registerRespondent({ nombres, apellidos, correoElectronico, fechaNacimiento }).subscribe({
        next: () => {
          this.router.navigateByUrl('/auth/encuestado-login');
        },
        error: () => {
          this.registerForm.controls.correoElectronico.setErrors({ registerError: true });
        }
      });
      return;
    }

    this.authService.register({
      username,
      password,
      correo,
      rol: { idRol: 2 },
      debeCambiarPass: false
    }).subscribe({
      next: () => {
        const basicToken = `Basic ${this.toBase64Utf8(`${username}:${password}`)}`;
        localStorage.setItem('auth_basic_token', basicToken);
        localStorage.setItem('auth_token', basicToken);
        localStorage.setItem('user_name', username);
        localStorage.setItem('user_role', 'DISENADOR');
        this.router.navigateByUrl('/disenador/encuestas');
      },
      error: () => {
        this.registerForm.controls.correo.setErrors({ registerError: true });
      }
    });
  }

  isRespondentSelected(): boolean {
    return this.registerForm.controls.accountType.value === 'ENCUESTADO';
  }

  isAdminSelected(): boolean {
    return this.registerForm.controls.accountType.value === 'DISENADOR';
  }

  onAccountTypeChange(): void {
    this.applyAccountValidators();
  }

  private applyAccountValidators(): void {
    const respondentValidators = [Validators.required, Validators.minLength(2)];
    const emailValidators = [Validators.required, Validators.email];
    const requiredValidators = [Validators.required];

    if (this.isRespondentSelected()) {
      this.registerForm.controls.nombres.setValidators(respondentValidators);
      this.registerForm.controls.apellidos.setValidators(respondentValidators);
      this.registerForm.controls.correoElectronico.setValidators(emailValidators);
      this.registerForm.controls.fechaNacimiento.setValidators(requiredValidators);
      this.registerForm.controls.username.clearValidators();
      this.registerForm.controls.correo.clearValidators();
      this.registerForm.controls.password.clearValidators();
      this.registerForm.controls.confirmPassword.clearValidators();
    } else {
      this.registerForm.controls.nombres.clearValidators();
      this.registerForm.controls.apellidos.clearValidators();
      this.registerForm.controls.correoElectronico.clearValidators();
      this.registerForm.controls.fechaNacimiento.clearValidators();
      this.registerForm.controls.username.setValidators([Validators.required, Validators.minLength(3)]);
      this.registerForm.controls.correo.setValidators(emailValidators);
      this.registerForm.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
      this.registerForm.controls.confirmPassword.setValidators(requiredValidators);
    }

    this.registerForm.controls.nombres.updateValueAndValidity({ emitEvent: false });
    this.registerForm.controls.apellidos.updateValueAndValidity({ emitEvent: false });
    this.registerForm.controls.correoElectronico.updateValueAndValidity({ emitEvent: false });
    this.registerForm.controls.fechaNacimiento.updateValueAndValidity({ emitEvent: false });
    this.registerForm.controls.username.updateValueAndValidity({ emitEvent: false });
    this.registerForm.controls.correo.updateValueAndValidity({ emitEvent: false });
    this.registerForm.controls.password.updateValueAndValidity({ emitEvent: false });
    this.registerForm.controls.confirmPassword.updateValueAndValidity({ emitEvent: false });
  }

  private passwordsMatch(control: AbstractControl): ValidationErrors | null {
    if (control.get('accountType')?.value === 'ENCUESTADO') {
      return null;
    }

    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    return password && confirmPassword && password !== confirmPassword ? { passwordsMismatch: true } : null;
  }

  private toBase64Utf8(value: string): string {
    const bytes = new TextEncoder().encode(value);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
    return btoa(binary);
  }
}
