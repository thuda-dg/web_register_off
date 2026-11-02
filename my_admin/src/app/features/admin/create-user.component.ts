import { Component, inject, OnInit, output, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService } from '../../core/services/admin.services';
import { CreateUserOptions, EmployeeItem } from '../../core/models/admin.model';

@Component({
  selector: 'app-create-user',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section aria-labelledby="create-user-title" class="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 id="create-user-title" class="text-lg font-semibold">Tạo user mới</h3>
      <p class="mt-1 text-sm text-slate-500">Tài khoản được kích hoạt ngay. User có thể đăng nhập bằng mã nhân viên hoặc email.</p>
      @if (error()) {
        <p role="alert" class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error() }}</p>
      }
      @if (loading()) {
        <p role="status" class="mt-4 text-sm text-slate-500">Đang tải team và role...</p>
      } @else if (!options()) {
        <button type="button" (click)="loadOptions()" class="mt-4 rounded-lg border px-4 py-2">Thử lại</button>
        <button type="button" (click)="cancelled.emit()" class="ml-3 rounded-lg border px-4 py-2">Đóng</button>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" class="mt-5">
          <fieldset [disabled]="saving()" class="grid gap-4 sm:grid-cols-2">
            <label class="text-sm font-medium">Mã nhân viên *
              <input formControlName="employeeCode" required maxlength="50" autocomplete="off"
                class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label class="text-sm font-medium">Họ tên *
              <input formControlName="fullName" required maxlength="150" autocomplete="name"
                class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label class="text-sm font-medium">Email *
              <input formControlName="email" type="email" required maxlength="255" autocomplete="email"
                class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label class="text-sm font-medium">Team
              <select formControlName="teamId" class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2">
                <option [ngValue]="null">Chưa có team</option>
                @for (team of options()!.teams; track team.id) {
                  <option [ngValue]="team.id">{{ team.name }}</option>
                }
              </select>
            </label>
            <label class="text-sm font-medium">Mật khẩu *
              <input formControlName="password" type="password" required minlength="8" maxlength="72" autocomplete="new-password"
                class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
              <span class="mt-1 block text-xs text-slate-500">Ít nhất 8 ký tự, tối đa 72 byte.</span>
            </label>
            <label class="text-sm font-medium">Nhập lại mật khẩu *
              <input formControlName="confirmPassword" type="password" required autocomplete="new-password"
                class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <fieldset class="sm:col-span-2">
              <legend class="text-sm font-medium">Role *</legend>
              <div class="mt-2 flex flex-wrap gap-4">
                @for (role of options()!.roles; track role.id) {
                  <label class="flex items-center gap-2 text-sm">
                    <input type="checkbox" [checked]="form.controls.roleIds.value.includes(role.id)"
                      (change)="toggleRole(role.id, $any($event.target).checked)" />
                    {{ role.name }}
                  </label>
                } @empty {
                  <p class="text-sm text-red-700">Chưa có role đang hoạt động. Vui lòng cấu hình role trước.</p>
                }
              </div>
            </fieldset>
          </fieldset>
          @if (submitted() && form.invalid) {
            <p role="alert" class="mt-4 text-sm text-red-700">Vui lòng điền đủ thông tin bắt buộc, email hợp lệ, mật khẩu từ 8 ký tự và chọn ít nhất một role.</p>
          }
          <div class="mt-6 flex gap-3">
            <button type="submit" [disabled]="saving() || !options()!.roles.length"
              class="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {{ saving() ? 'Đang tạo...' : 'Tạo user' }}
            </button>
            <button type="button" [disabled]="saving()" (click)="cancelled.emit()"
              class="rounded-lg border border-slate-300 px-5 py-2 disabled:opacity-60">Hủy</button>
          </div>
        </form>
      }
    </section>
  `
})
export class CreateUserComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  readonly created = output<EmployeeItem>();
  readonly cancelled = output<void>();
  readonly options = signal<CreateUserOptions | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    employeeCode: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)]],
    fullName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmPassword: ['', Validators.required],
    teamId: this.fb.control<number | null>(null),
    roleIds: this.fb.nonNullable.control<number[]>([], Validators.required)
  });

  ngOnInit(): void { this.loadOptions(); }

  loadOptions(): void {
    this.loading.set(true);
    this.error.set('');
    this.adminService.getCreateUserOptions().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: options => {
        this.options.set(options);
        const employeeRole = options.roles.find(role => role.code === 'EMPLOYEE');
        this.form.controls.roleIds.setValue(employeeRole ? [employeeRole.id] : []);
      },
      error: error => this.error.set(error.error?.message || 'Không tải được team và role.')
    });
  }

  toggleRole(id: number, checked: boolean): void {
    const control = this.form.controls.roleIds;
    control.setValue(checked ? [...new Set([...control.value, id])] : control.value.filter(value => value !== id));
  }

  submit(): void {
    if (this.saving()) return;
    this.submitted.set(true);
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { confirmPassword, ...payload } = this.form.getRawValue();
    if (payload.password !== confirmPassword) {
      this.error.set('Mật khẩu nhập lại không khớp.');
      return;
    }
    if (new TextEncoder().encode(payload.password).length > 72) {
      this.error.set('Mật khẩu không được vượt quá 72 byte.');
      return;
    }
    this.saving.set(true);
    this.adminService.createUser({
      ...payload,
      employeeCode: payload.employeeCode.trim(),
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase()
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: response => {
        this.form.reset();
        this.created.emit(response.item);
      },
      error: error => this.error.set(error.error?.message || 'Không tạo được user. Vui lòng thử lại.')
    });
  }
}
