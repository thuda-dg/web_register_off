import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <section class="min-h-screen bg-slate-100 px-4 py-10 text-slate-800">
      <div class="mx-auto flex max-w-md flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div class="mb-6 text-center">
          <h1 class="text-2xl font-bold text-emerald-700">Đăng nhập</h1>
          <p class="mt-2 text-sm text-slate-500">Đăng nhập để sử dụng hệ thống lịch nghỉ</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium">Email hoặc mã nhân viên</label>
            <input formControlName="identifier" class="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="example@company.com" />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium">Mật khẩu</label>
            <input type="password" formControlName="password" class="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="********" />
          </div>

          <div *ngIf="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {{ errorMessage }}
          </div>

          <button type="submit" [disabled]="loading" class="w-full rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {{ loading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
          </button>
        </form>

        <div class="mt-6 text-center text-sm text-slate-500">
          Chưa có tài khoản?
          <a routerLink="/register" class="ml-1 font-semibold text-emerald-700">Đăng ký ngay</a>
        </div>
      </div>
    </section>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form: FormGroup = this.fb.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required]
  });

  loading = false;
  errorMessage = '';

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.form.value).subscribe({
  next: () => {
    this.router.navigate(['/schedule']);
  },

 error: (error) => {
  console.log('========== LOGIN ERROR ==========');
  console.log('STATUS:', error?.status);
  console.log('ERROR BODY:', error?.error);

  this.loading = false;
  this.errorMessage = error?.error?.message || 'Đăng nhập thất bại.';

  console.log('errorMessage =', this.errorMessage);
},

  complete: () => {
    this.loading = false;
  }
});
  }
}
