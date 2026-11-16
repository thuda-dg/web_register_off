import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { RegistrationCycle } from '../../core/models/registration-cycle.model';
import { RegistrationCycleService } from '../../core/services/registration-cycle.service';

function validDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1000 &&
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateDates(control: AbstractControl): ValidationErrors | null {
  const { startDate, endDate } = control.value;
  if ((startDate && !validDate(startDate)) || (endDate && !validDate(endDate))) return { invalidDate: true };
  return startDate && endDate && startDate > endDate ? { dateOrder: true } : null;
}

@Component({
  selector: 'app-registration-cycles', standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe], templateUrl: './registration-cycles.html'
})
export class RegistrationCycles implements OnInit {
  private readonly service = inject(RegistrationCycleService);
  private readonly destroyRef = inject(DestroyRef);
  readonly form = inject(FormBuilder).nonNullable.group({
    startDate: ['', Validators.required], endDate: ['', Validators.required]
  }, { validators: validateDates });
  private readonly dates = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly cycles = signal<RegistrationCycle[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly error = signal('');
  readonly success = signal('');
  readonly busy = computed(() => this.loading() || this.saving());
  readonly preview = computed(() => {
    const endDate = this.dates().endDate || '';
    if (!validDate(endDate)) return null;
    const year = Number(endDate.slice(0, 4)), month = Number(endDate.slice(5, 7));
    const previous = (month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`).padStart(7, '0');
    return { name: `Kỳ tháng ${endDate.slice(5, 7)}/${year}`, code: endDate.slice(0, 7),
      open: `${previous}-17T00:00:00+07:00`, close: `${previous}-23T23:59:59.999+07:00` };
  });

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    if (this.busy()) return;
    this.loading.set(true); this.loadError.set('');
    this.service.list().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: response => {
        if (response.ok) this.cycles.set(response.items);
        else this.loadError.set('Không tải được danh sách kỳ đăng ký.');
      },
      error: error => this.loadError.set(error.error?.message || 'Không tải được danh sách kỳ. Vui lòng thử lại.')
    });
  }

  reset(): void {
    if (this.busy()) return;
    this.form.reset(); this.error.set(''); this.success.set('');
  }

  create(): void {
    if (this.busy()) return;
    this.error.set(''); this.success.set(''); this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);
    const payload = this.form.getRawValue();
    this.form.disable();
    this.service.create(payload).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
      this.saving.set(false); this.form.enable();
    })).subscribe({
      next: response => {
        if (!response.ok) { this.error.set(response.message || 'Không tạo được kỳ đăng ký.'); return; }
        this.cycles.update(rows => [response.data, ...rows.filter(row => row.id !== response.data.id)]
          .sort((a, b) => b.startDate.localeCompare(a.startDate) || b.id - a.id));
        this.success.set(response.message); this.form.reset();
      },
      error: error => this.error.set(error.error?.message || 'Không tạo được kỳ đăng ký. Vui lòng thử lại.')
    });
  }

  statusLabel(cycle: RegistrationCycle): string {
    if (cycle.status === 'DRAFT') return 'Bản nháp';
    if (cycle.status === 'CLOSED') return 'Đã đóng';
    if (cycle.status === 'ARCHIVED') return 'Đã lưu trữ';
    const now = Date.now();
    if (now < new Date(cycle.registrationOpenTime).getTime()) return 'Chưa đến lịch mở';
    return now <= new Date(cycle.registrationClosingTime).getTime() ? 'Đang nhận đăng ký' : 'Đã hết thời gian';
  }
}
