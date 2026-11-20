import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { PublishedScheduleService } from '../../../../core/services/published-schedule.service';
import { PublishedScheduleRow } from '../../../../core/models/published-schedule.models';

@Component({ selector: 'app-my-published-offs', standalone: true,
  imports: [FormsModule, DatePipe], templateUrl: './my-published-offs.html' })
export class MyPublishedOffs implements OnInit {
  private readonly service = inject(PublishedScheduleService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly knownCycles = new Map<string, string>();
  readonly rows = signal<PublishedScheduleRow[]>([]);
  readonly cycle = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly filtered = computed(() => this.rows().filter(row => !this.cycle() || row.cycleKey === this.cycle()));
  readonly cycles = computed(() => {
    const values = new Map(this.rows().map(row => [row.cycleKey, row.cycleLabel]));
    if (this.cycle() && !values.has(this.cycle())) values.set(this.cycle(), this.knownCycles.get(this.cycle()) || this.cycle());
    return [...values].map(([value, label]) => ({ value, label }));
  });
  ngOnInit(): void { this.load(); }
  load(): void {
    if (this.loading()) return;
    this.loading.set(true); this.error.set('');
    this.service.getMyPublishedSchedule().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: response => {
        if (!response.ok) { this.error.set('Không tải được lịch OFF đã công bố.'); return; }
        const rows = response.rows.filter(row => row.type === 'OFF').sort((a, b) => a.date.localeCompare(b.date));
        for (const row of rows) this.knownCycles.set(row.cycleKey, row.cycleLabel);
        this.rows.set(rows);
      },
      error: error => this.error.set(error.error?.message || 'Không tải được lịch OFF đã công bố. Vui lòng làm mới.')
    });
  }
}
