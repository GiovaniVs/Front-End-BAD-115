import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

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

    readonly loginForm = this.formBuilder.nonNullable.group({
        email: ['', [Validators.required, Validators.email]], 
        password : ['', [Validators.required, Validators.minLength(6)]]
    })

    onSubmit():void{
        if(this.loginForm.invalid){
            this.loginForm.markAllAsTouched(); 
            return; 
        }
        const {email, password} = this.loginForm.getRawValue(); 
        this.authService.loginByRole('ADMIN', email, password).subscribe({
            next:(response)=>{
                localStorage.setItem('auth_token', response.token); 
                localStorage.setItem('user_role', response.role);
            },
            error: () => {
              this.loginForm.controls.password.setErrors({ invalidCredentials: true });
            }
        }); 
    }

}
