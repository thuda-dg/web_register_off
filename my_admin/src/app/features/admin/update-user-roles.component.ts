import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AdminService } from '../../core/services/admin.services';
import { EmployeeItem, EmployeeRole, UpdateUserRolesResponse } from '../../core/models/admin.model';

@Component({
  selector: 'app-update-user-roles',
  standalone: true,
  template: `
    <section aria-labelledby="update-role-title" class="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-left">
      <h3 id="update-role-title" class="font-semibold">Cập nhật role: {{ employee().fullName }}</h3>
      <p class="mt-1 text-sm text-slate-500">{{ employee().employeeCode }} · {{ employee().email }}</p>
      <p class="mt-2 text-sm text-slate-600">Chọn ít nhất một role. Quyền trong phiên đăng nhập của user được cập nhật khi làm mới phiên hoặc đăng nhập lại.</p>
      @if (error()) {
        <p role="alert" class="mt-3 text-sm text-red-700">{{ error() }}</p>
      }
      @if (loading()) {
        <p role="status" class="mt-3 text-sm">Đang tải role...</p>
      } @else if (!loaded()) {
        <button type="button" (click)="loadRoles()" class="mt-3 rounded-lg border px-4 py-2">Thử lại</button>
      } @else {
        <fieldset [disabled]="saving()" class="mt-4 flex flex-wrap gap-4">
          <legend class="sr-only">Role của user</legend>
          @for (role of roles(); track role.id) {
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" [checked]="selectedIds().includes(role.id)"
                (change)="toggleRole(role.id, $any($event.target).checked)" />
              {{ role.name }}
            </label>
          } @empty {
            <p class="text-sm text-slate-600">Chưa có role đang hoạt động.</p>
          }
        </fieldset>
      }
      <div class="mt-4 flex gap-3">
        <button type="button" (click)="save()" [disabled]="saving() || !loaded() || !selectedIds().length"
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {{ saving() ? 'Đang lưu...' : 'Lưu role' }}
        </button>
        <button type="button" (click)="cancelled.emit()" [disabled]="saving()"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-60">Hủy</button>
      </div>
    </section>
  `
})
export class UpdateUserRolesComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  readonly employee = input.required<EmployeeItem>();
  readonly saved = output<UpdateUserRolesResponse>();
  readonly cancelled = output<void>();
  readonly busy = output<boolean>();
  readonly roles = signal<EmployeeRole[]>([]);
  readonly selectedIds = signal<number[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  ngOnInit(): void { this.loadRoles(); }

  loadRoles(): void {
    this.loading.set(true);
    this.error.set('');
    this.adminService.getCreateUserOptions().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: response => {
        this.roles.set(response.roles);
        this.selectedIds.set(this.employee().roles.map(role => role.id).filter(id => response.roles.some(role => role.id === id)));
        this.loaded.set(true);
      },
      error: error => this.error.set(error.error?.message || 'Không tải được danh sách role.')
    });
  }

  toggleRole(id: number, checked: boolean): void {
    this.selectedIds.update(ids => checked ? [...new Set([...ids, id])] : ids.filter(value => value !== id));
  }

  save(): void {
    if (this.saving() || !this.loaded()) return;
    if (!this.selectedIds().length) {
      this.error.set('Vui lòng chọn ít nhất một role.');
      return;
    }
    this.error.set('');
    this.saving.set(true);
    this.busy.emit(true);
    this.adminService.updateUserRoles(this.employee().id, this.selectedIds()).pipe(finalize(() => {
      this.saving.set(false);
      this.busy.emit(false);
    })).subscribe({
      next: response => this.saved.emit(response),
      error: error => this.error.set(error.error?.message || 'Không cập nhật được role. Vui lòng thử lại.')
    });
  }
}
