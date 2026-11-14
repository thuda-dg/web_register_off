import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService } from '../../core/services/admin.services';
import { EmployeeItem, EmployeeRole, UpdateUserTeamResponse } from '../../core/models/admin.model';

@Component({
  selector: 'app-update-user-team',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section aria-labelledby="update-team-title" class="rounded-xl border border-blue-200 bg-blue-50 p-5 text-left">
      <h3 id="update-team-title" class="font-semibold">Cập nhật team: {{ employee().fullName }}</h3>
      <p class="mt-1 text-sm text-slate-500">{{ employee().employeeCode }} · {{ employee().email }}</p>
      <p class="mt-2 text-sm text-slate-600">Mỗi nhân viên chỉ thuộc một team tại một thời điểm. Thay đổi có hiệu lực từ hôm nay.</p>
      @if (error()) {
        <p role="alert" class="mt-3 text-sm text-red-700">{{ error() }}</p>
      }
      @if (loading()) {
        <p role="status" class="mt-3 text-sm">Đang tải team...</p>
      } @else if (!loaded()) {
        <button type="button" (click)="loadTeams()" class="mt-3 rounded-lg border px-4 py-2">Thử lại</button>
      } @else {
        <fieldset [disabled]="saving()" class="mt-4">
          <label class="text-sm font-medium">Team
            <select [formControl]="teamId" class="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:max-w-md">
              <option [ngValue]="null" disabled>Chọn một team</option>
              @for (team of teams(); track team.id) {
                <option [ngValue]="team.id">{{ team.name }}</option>
              }
            </select>
          </label>
        </fieldset>
        @if (!teams().length) {
          <p class="mt-3 text-sm text-slate-600">Chưa có team đang hoạt động.</p>
        }
      }
      <div class="mt-4 flex gap-3">
        <button type="button" (click)="save()" [disabled]="saving() || !loaded() || teamId.invalid"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {{ saving() ? 'Đang lưu...' : 'Lưu team' }}
        </button>
        <button type="button" (click)="cancelled.emit()" [disabled]="saving()"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-60">Hủy</button>
      </div>
    </section>
  `
})
export class UpdateUserTeamComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  readonly employee = input.required<EmployeeItem>();
  readonly saved = output<UpdateUserTeamResponse>();
  readonly cancelled = output<void>();
  readonly busy = output<boolean>();
  readonly teamId = new FormControl<number | null>(null, [Validators.required, Validators.min(1)]);
  readonly teams = signal<EmployeeRole[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  ngOnInit(): void { this.loadTeams(); }

  loadTeams(): void {
    this.loading.set(true);
    this.loaded.set(false);
    this.error.set('');
    this.adminService.getCreateUserOptions().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: response => {
        this.teams.set(response.teams);
        this.teamId.setValue(response.teams.some(team => team.id === this.employee().teamId) ? this.employee().teamId : null);
        this.loaded.set(true);
      },
      error: error => this.error.set(error.error?.message || 'Không tải được danh sách team.')
    });
  }

  save(): void {
    if (this.saving() || !this.loaded()) return;
    const teamId = this.teamId.value;
    if (this.teamId.invalid || teamId === null || !this.teams().some(team => team.id === teamId)) {
      this.error.set('Vui lòng chọn một team hợp lệ.');
      return;
    }
    this.error.set('');
    this.saving.set(true);
    this.busy.emit(true);
    this.adminService.updateUserTeam(this.employee().id, teamId).pipe(finalize(() => {
      this.saving.set(false);
      this.busy.emit(false);
    })).subscribe({
      next: response => this.saved.emit(response),
      error: error => this.error.set(error.error?.message || 'Không cập nhật được team. Vui lòng thử lại.')
    });
  }
}
