import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { OffApprovalRow } from '../../core/models/off-approval.model';
import { OffApprovalService } from '../../core/services/off-approval.service';

@Component({
  selector: 'app-off-approvals', standalone: true,
  imports: [FormsModule, DatePipe], templateUrl: './off-approvals.html'
})
export class OffApprovals implements OnInit {
  private readonly service = inject(OffApprovalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly knownCycles = new Map<string, string>();
  readonly rows = signal<OffApprovalRow[]>([]);
  readonly teamName = signal('');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly actionError = signal('');
  readonly cycle = signal('');
  readonly status = signal('PENDING_TL');
  readonly search = signal('');
  readonly selected = signal<OffApprovalRow | null>(null);
  readonly decision = signal<'approve' | 'reject'>('approve');
  note = '';
  readonly pendingCount = computed(() => this.rows().filter(row => row.status === 'PENDING_TL').length);
  readonly cycles = computed(() => {
    const values = new Map(this.rows().map(row => [row.cycleId, row.cycleName]));
    if (this.cycle() && !values.has(this.cycle())) values.set(this.cycle(), this.knownCycles.get(this.cycle()) || this.cycle());
    return [...values].map(([value, label]) => ({ value, label }));
  });
  readonly filtered = computed(() => {
    const text = this.search().trim().toLocaleLowerCase('vi');
    return this.rows().filter(row => (!this.cycle() || row.cycleId === this.cycle()) &&
      (!this.status() || row.status === this.status()) &&
      (!text || `${row.employeeCode} ${row.employeeName}`.toLocaleLowerCase('vi').includes(text)));
  });
  ngOnInit(): void { this.load(); }

  load(): void {
    if (this.loading() || this.saving()) return;
    this.loading.set(true); this.error.set('');
    this.service.list().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: response => {
        if (!response.ok) { this.error.set('Không tải được danh sách duyệt.'); return; }
        for (const row of response.data.rows) this.knownCycles.set(row.cycleId, row.cycleName);
        this.rows.set(response.data.rows); this.teamName.set(response.data.teamName);
      },
      error: error => {
        if (error.status === 403) this.rows.set([]);
        this.error.set(error.error?.message || 'Không tải được danh sách duyệt. Vui lòng làm mới.');
      }
    });
  }

  open(row: OffApprovalRow, decision: 'approve' | 'reject'): void {
    if (this.loading() || this.saving() || row.status !== 'PENDING_TL') return;
    this.actionError.set(''); this.error.set(''); this.success.set('');
    this.note = ''; this.decision.set(decision); this.selected.set({ ...row });
  }
  close(): void { if (!this.saving()) { this.selected.set(null); this.note = ''; this.actionError.set(''); } }

  confirm(): void {
    const row = this.selected();
    if (!row || this.saving()) return;
    const note = this.note.trim();
    if (note.length > 1000 || (this.decision() === 'reject' && !note)) {
      this.actionError.set('Vui lòng nhập lý do từ chối; ghi chú tối đa 1000 ký tự.'); return;
    }
    this.saving.set(true); this.actionError.set('');
    this.service.decide(row.entryId, this.decision(), note)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false))).subscribe({
        next: response => {
          if (!response.ok) { this.actionError.set('Không xử lý được đơn.'); return; }
          this.rows.update(rows => rows.map(item => item.entryId === response.data.entryId ? { ...item, ...response.data } : item));
          this.selected.set(null); this.note = ''; this.success.set(response.message);
        },
        error: error => {
          const message = error.error?.message || 'Không xử lý được đơn. Vui lòng thử lại.';
          if ([403, 404, 409].includes(error.status)) {
            this.saving.set(false); this.selected.set(null); this.load(); this.error.set(message);
          } else this.actionError.set(message);
        }
      });
  }
  label(status: string): string {
    return ({ PENDING_TL: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', PUBLISHED: 'Đã công bố', UNPUBLISHED: 'Đã bỏ công bố', CANCELLED: 'Đã hủy' } as Record<string, string>)[status] || status;
  }
}
