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

  private loadingTimer?: ReturnType<typeof setTimeout>;

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
    this.errorMessage = '';

    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
    }

    this.loadingTimer = setTimeout(() => {
      this.loading = true;
    }, 300);

    this.registrationService.getMyRegistrationHistory().subscribe({
      next: response => {
        if (this.loadingTimer) {
          clearTimeout(this.loadingTimer);
        }

        this.loading = false;

        console.log('HISTORY RESPONSE', response);

        if (!response.ok) {
          this.resetHistory();

          this.errorMessage = 'Không tải được lịch sử đăng ký.';

          this.cdr.detectChanges();
          return;
        }

        /*
         * SET DATA
         */
        this.allRows = response.data?.rows ?? [];

        this.summary = response.data?.summary ?? {
          total: 0,
          pending: 0,
          approved: 0,
          published: 0
        };

        /*
         * BUILD OPTION
         */
        this.buildFilterOptions();

        /*
         * DEFAULT FILTER ALL
         */
        this.filters = {
          cycle: 'ALL',
          type: 'ALL',
          status: 'ALL'
        };

        /*
         * DISPLAY ALL DATA
         */
        this.filteredRows = [...this.allRows];

        console.log('INITIAL DATA', {
          all: this.allRows.length,
          filtered: this.filteredRows.length,
          filters: this.filters
        });

        /*
         * Angular 22 zoneless
         * cần trigger CD
         */
        queueMicrotask(() => {
          console.log('RUN CHANGE DETECTION');

          this.cdr.detectChanges();
        });
      },

      error: error => {
        if (this.loadingTimer) {
          clearTimeout(this.loadingTimer);
        }

        console.error('LOAD HISTORY ERROR', error);

        this.loading = false;

        this.resetHistory();

        this.errorMessage = 'Có lỗi xảy ra khi tải lịch sử đăng ký.';

        this.cdr.detectChanges();
      }
    });
  }

  onFiltersChange(filters: HistoryFiltersValue): void {
    console.log('FILTER EVENT', filters);

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

    console.log('FILTER RESULT', this.filteredRows.length);

    this.cdr.detectChanges();
  }

  private buildFilterOptions(): void {
    const cycleMap = new Map<string, string>();

    this.allRows.forEach(row => {
      cycleMap.set(row.cycleKey, row.cycleLabel);
    });

    this.filterOptions = {
      cycles: [...cycleMap.entries()].map(([value, label]) => ({
        value,
        label
      })),

      types: [
        ...new Set(this.allRows.map(x => x.type))
      ],

      statuses: [
        ...new Set(this.allRows.map(x => x.tlStatus))
      ].map(status => ({
        value: status,
        label: this.getStatusLabel(status)
      }))
    };
  }

  private resetHistory(): void {
    this.allRows = [];

    this.filteredRows = [];

    this.summary = {
      total: 0,
      pending: 0,
      approved: 0,
      published: 0
    };

    this.filterOptions = {
      cycles: [],
      types: [],
      statuses: []
    };
  }

  private getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING_TL: 'Chờ TL duyệt',
      TL_APPROVED: 'TL đã duyệt',
      TL_REJECTED: 'TL từ chối',
      PUBLIC: 'Đã public'
    };

    return map[status] ?? status;
  }

  ngOnDestroy(): void {
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
    }
  }
}