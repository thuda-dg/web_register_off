import { finalize, Subscription } from 'rxjs';
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import {
  HistoryFilterOptions,
  HistoryFiltersValue,
  HistoryRow,
  HistorySummary
} from '../../core/models/history.models';

import { RegistrationService } from '../../core/services/registration.service';

import { HistoryFiltersComponent } from './components/history-filters/history-filters';
import { HistorySummaryComponent } from './components/history-summary/history-summary';
import { HistoryTableComponent } from './components/history-table/history-table';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    HistorySummaryComponent,
    HistoryFiltersComponent,
    HistoryTableComponent
  ],
  templateUrl: './history.html'
})
export class History implements OnInit, OnDestroy {
  loading = false;

  private historyRequest?: Subscription;

  errorMessage = '';

  allRows: HistoryRow[] = [];

  filteredRows: HistoryRow[] = [];

  summary: HistorySummary = {
    total: 0,
    pending: 0,
    approved: 0,
    published: 0
  };

  filters: HistoryFiltersValue = {
    cycle: 'ALL',
    type: 'ALL',
    status: 'ALL'
  };

  filterOptions: HistoryFilterOptions = {
    cycles: [],
    types: [],
    statuses: []
  };

  constructor(
    private readonly registrationService: RegistrationService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.filters = {
      cycle: 'ALL',
      type: 'ALL',
      status: 'ALL'
    };

    this.loadHistory();
  }

  loadHistory(): void {
    if (this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    this.historyRequest = this.registrationService.getMyRegistrationHistory()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: response => {
          if (!response.ok) {
            this.errorMessage = response.message || 'Không tải được lịch sử đăng ký.';
            return;
          }
          this.allRows = response.data?.rows ?? [];
          this.summary = response.data?.summary ?? { total: 0, pending: 0, approved: 0, published: 0 };
          this.buildFilterOptions();
          this.applyFilters();
        },
        error: () => {
          // Keep the previous rows, options and selection so a retry is possible.
          this.errorMessage = 'Có lỗi xảy ra khi tải lịch sử đăng ký. Vui lòng thử làm mới.';
        }
      });
  }

  onFiltersChange(filters: HistoryFiltersValue): void {
    if (!filters) {
      return;
    }

    this.filters = {
      cycle: filters.cycle || 'ALL',
      type: filters.type || 'ALL',
      status: filters.status || 'ALL'
    };

    this.applyFilters();
  }

  private applyFilters(): void {
    if (this.allRows.length === 0) {
      this.filteredRows = [];
      return;
    }

    this.filteredRows = this.allRows.filter(row => {
      const cycleOK =
        this.filters.cycle === 'ALL' ||
        row.cycleKey === this.filters.cycle;

      const typeOK =
        this.filters.type === 'ALL' ||
        row.type === this.filters.type;

      const statusOK =
        this.filters.status === 'ALL' ||
        row.tlStatus === this.filters.status;

      return cycleOK && typeOK && statusOK;
    });

    this.cdr.markForCheck();
  }

  private buildFilterOptions(): void {
    const cycleMap = new Map<string, string>();

    this.allRows.forEach(row => {
      cycleMap.set(row.cycleKey, row.cycleLabel);
    });

    const previous = this.filterOptions;
    if (this.filters.cycle !== 'ALL' && !cycleMap.has(this.filters.cycle)) {
      cycleMap.set(this.filters.cycle, previous.cycles.find(option => option.value === this.filters.cycle)?.label || this.filters.cycle);
    }
    const types = new Set(this.allRows.map(row => row.type));
    const statuses = new Set(this.allRows.map(row => row.tlStatus));
    if (this.filters.type !== 'ALL') types.add(this.filters.type);
    if (this.filters.status !== 'ALL') statuses.add(this.filters.status);
    this.filterOptions = {
      cycles: [...cycleMap.entries()].map(([value, label]) => ({
        value,
        label
      })),

      types: [...types],

      statuses: [...statuses].map(status => ({
        value: status,
        label: this.getStatusLabel(status)
      }))
    };
  }

  private getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING_TL: 'Chờ TL duyệt',
      APPROVED: 'TL đã duyệt',
      TL_APPROVED: 'TL đã duyệt',
      REJECTED: 'TL từ chối',
      TL_REJECTED: 'TL từ chối',
      PUBLIC: 'Đã public',
      PUBLISHED: 'Đã public',
      UNPUBLISHED: 'Đã bỏ công bố',
      CANCELLED: 'Đã hủy'
    };

    return map[status] ?? status;
  }

  ngOnDestroy(): void {
    this.historyRequest?.unsubscribe();
  }
}