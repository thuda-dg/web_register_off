import { Component, computed, DestroyRef, inject, OnInit, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { OffApprovalRow } from '../../../../core/models/off-approval.model';
import { OffApprovalService } from '../../../../core/services/off-approval.service';
import { PublishedScheduleService } from '../../../../core/services/published-schedule.service';

@Component({ selector: 'app-publish-off-panel', standalone: true,
  imports: [FormsModule, RouterLink, DatePipe], templateUrl: './publish-off-panel.html' })
export class PublishOffPanel implements OnInit {
  private readonly approvals = inject(OffApprovalService);
  private readonly service = inject(PublishedScheduleService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly knownCycles = new Map<string, string>();
  readonly published = output<void>();
  readonly rows = signal<OffApprovalRow[]>([]);
  readonly team = signal('');
  readonly cycle = signal('');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly confirmation = signal<{ cycleId: string; cycleName: string; entryIds: number[] } | null>(null);
  readonly cycles = computed(() => {
    const values = new Map(this.rows().map(row => [row.cycleId, row.cycleName]));
    if (this.cycle() && !values.has(this.cycle())) values.set(this.cycle(), this.knownCycles.get(this.cycle()) || this.cycle());
    return [...values].map(([value, label]) => ({ value, label }));
  });
  readonly inCycle = computed(() => this.rows().filter(row => row.cycleId === this.cycle()));
  readonly approved = computed(() => this.inCycle().filter(row => row.status === 'APPROVED'));
  readonly pending = computed(() => this.inCycle().filter(row => row.status === 'PENDING_TL').length);
  readonly canPublish = computed(() => !!this.cycle() && this.approved().length > 0 && !this.pending() &&
    !this.loading() && !this.saving() && !this.error());
  ngOnInit(): void { this.load(); }

  load(): void {
    if (this.loading() || this.saving() || this.confirmation()) return;
    this.loading.set(true); this.error.set('');
    this.approvals.list().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: response => {
        if (!response.ok) { this.error.set('Không tải được danh sách chờ công bố.'); return; }
        for (const row of response.data.rows) this.knownCycles.set(row.cycleId, row.cycleName);
        this.rows.set(response.data.rows); this.team.set(response.data.teamName);
      },
      error: error => {
        if (error.status === 403) this.rows.set([]);
        this.error.set(error.error?.message || 'Không tải được danh sách chờ công bố. Vui lòng làm mới.');
      }
    });
  }
  changeCycle(value: string): void {
    if (this.loading() || this.saving() || this.confirmation()) return;
    this.cycle.set(value); this.success.set('');
  }
  open(): void {
    if (!this.canPublish() || this.confirmation()) return;
    this.success.set('');
    this.confirmation.set({ cycleId: this.cycle(), cycleName: this.knownCycles.get(this.cycle()) || this.cycle(),
      entryIds: this.approved().map(row => row.entryId) });
  }
  close(): void { if (!this.saving()) this.confirmation.set(null); }
  confirm(): void {
    const confirmation = this.confirmation();
    if (!confirmation || this.saving()) return;
    this.saving.set(true); this.error.set('');
    this.service.publish(Number(confirmation.cycleId), [...confirmation.entryIds])
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false))).subscribe({
        next: response => {
          if (!response.ok) { this.error.set(response.message || 'Không công bố được lịch OFF.'); return; }
          const ids = new Set(response.data.entryIds);
          this.rows.update(rows => rows.map(row => ids.has(row.entryId) ? { ...row, status: 'PUBLISHED' } : row));
          this.confirmation.set(null); this.success.set(response.message); this.published.emit();
        },
        error: error => {
          const message = error.error?.message || 'Không công bố được lịch OFF. Vui lòng thử lại.';
          if ([403, 404, 409].includes(error.status)) {
            this.confirmation.set(null); this.saving.set(false); this.load();
          }
          this.error.set(message);
        }
      });
  }
}
