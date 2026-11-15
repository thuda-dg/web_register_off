import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService } from '../../core/services/admin.services';
import { EmployeeItem, EmployeeRole, UpdateUserTaskResponse } from '../../core/models/admin.model';

@Component({
  selector: 'app-update-user-task',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section aria-labelledby="update-task-title" class="rounded-xl border border-blue-200 bg-blue-50 p-5 text-left">
      <h3 id="update-task-title" class="font-semibold">Cập nhật task: {{ employee().fullName }}</h3>
      <p class="mt-1 text-sm text-slate-500">{{ employee().employeeCode }} · {{ employee().email }}</p>
      <p class="mt-2 text-sm text-slate-600">Mỗi nhân viên chỉ thuộc một task tại một thời điểm. Thay đổi có hiệu lực từ hôm nay.</p>
      @if (error()) {
        <p role="alert" class="mt-3 text-sm text-red-700">{{ error() }}</p>
      }
      @if (loading()) {
        <p role="status" class="mt-3 text-sm">Đang tải task...</p>
      } @else if (!loaded()) {
        <button type="button" (click)="loadTasks()" class="mt-3 rounded-lg border px-4 py-2">Thử lại</button>
      } @else {
        <fieldset [disabled]="saving()" class="mt-4">
          <label class="text-sm font-medium">Task
            <select [formControl]="taskId" class="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:max-w-md">
              <option [ngValue]="null" disabled>Chọn một task</option>
              @for (task of tasks(); track task.id) {
                <option [ngValue]="task.id">{{ task.name }}</option>
              }
            </select>
          </label>
        </fieldset>
        @if (!tasks().length) {
          <p class="mt-3 text-sm text-slate-600">Chưa có task đang hoạt động.</p>
        }
      }
      <div class="mt-4 flex gap-3">
        <button type="button" (click)="save()" [disabled]="saving() || !loaded() || taskId.invalid"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {{ saving() ? 'Đang lưu...' : 'Lưu task' }}
        </button>
        <button type="button" (click)="cancelled.emit()" [disabled]="saving()"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-60">Hủy</button>
      </div>
    </section>
  `
})
export class UpdateUserTaskComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  readonly employee = input.required<EmployeeItem>();
  readonly saved = output<UpdateUserTaskResponse>();
  readonly cancelled = output<void>();
  readonly busy = output<boolean>();
  readonly taskId = new FormControl<number | null>(null, [Validators.required, Validators.min(1)]);
  readonly tasks = signal<EmployeeRole[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  ngOnInit(): void { this.loadTasks(); }

  loadTasks(): void {
    this.loading.set(true);
    this.loaded.set(false);
    this.error.set('');
    this.adminService.getCreateUserOptions().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: response => {
        this.tasks.set((response.tasks ?? []));
        this.taskId.setValue((response.tasks ?? []).some(task => task.id === this.employee().taskId) ? (this.employee().taskId ?? null) : null);
        this.loaded.set(true);
      },
      error: error => this.error.set(error.error?.message || 'Không tải được danh sách task.')
    });
  }

  save(): void {
    if (this.saving() || !this.loaded()) return;
    const taskId = this.taskId.value;
    if (this.taskId.invalid || taskId === null || !this.tasks().some(task => task.id === taskId)) {
      this.error.set('Vui lòng chọn một task hợp lệ.');
      return;
    }
    this.error.set('');
    this.saving.set(true);
    this.busy.emit(true);
    this.adminService.updateUserTask(this.employee().id, taskId).pipe(finalize(() => {
      this.saving.set(false);
      this.busy.emit(false);
    })).subscribe({
      next: response => this.saved.emit(response),
      error: error => this.error.set(error.error?.message || 'Không cập nhật được task. Vui lòng thử lại.')
    });
  }
}
