import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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

    onSubmit():void{
        if(this.loginForm.invalid){
            this.loginForm.markAllAsTouched(); 
            return; 
        }
        const {username, password} = this.loginForm.getRawValue(); 
        this.authService.loginAdmin(username, password).subscribe({
            next:(response)=>{
                localStorage.setItem('auth_token', response.token); 
                localStorage.setItem('user_role', response.role || 'ADMINISTRADOR');
                localStorage.setItem('user_name', response.fullName || username);
                this.router.navigateByUrl('/admin/encuestas');
            },
            error: () => {
              this.loginForm.controls.password.setErrors({ invalidCredentials: true });
            }
        }); 
    }

}
