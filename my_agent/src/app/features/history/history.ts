import { Component, OnInit } from '@angular/core';
import {HistoryFilterOptions,HistoryFiltersValue,HistoryRow,HistorySummary} from '../../core/models/history.models';
import { HistoryMockService } from '../../core/services/history-mock.service';
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
export class History implements OnInit {
  loading = false;
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
    cycle: '',
    type: '',
    status: ''
  };

  filterOptions: HistoryFilterOptions = {
    cycles: [],
    types: [],
    statuses: []
  };

  constructor(
    private readonly historyService: HistoryMockService
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    this.errorMessage = '';

    this.historyService
      .getMyRegistrationHistory()
      .subscribe({
        next: response => {
          this.loading = false;

          if (!response.ok) {
            this.resetHistory();

            this.errorMessage =
              response.msg ??
              'Không tải được lịch sử đăng ký.';

            return;
          }

          this.allRows = response.rows ?? [];
          this.summary = response.summary;

          this.buildFilterOptions();
          this.applyFilters();
        },

        error: () => {
          this.loading = false;
          this.resetHistory();

          this.errorMessage =
            'Có lỗi xảy ra khi tải lịch sử đăng ký.';
        }
      });
  }

  onFiltersChange(filters: HistoryFiltersValue): void {
    this.filters = filters;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredRows = this.allRows.filter(row => {
      const matchesCycle =
        !this.filters.cycle ||
        row.cycleKey === this.filters.cycle;

      const matchesType =
        !this.filters.type ||
        row.type === this.filters.type;

      const matchesStatus =
        !this.filters.status ||
        row.tlStatus === this.filters.status;

      return (
        matchesCycle &&
        matchesType &&
        matchesStatus
      );
    });
  }

  private buildFilterOptions(): void {
    const cycleMap = new Map<string, string>();

    for (const row of this.allRows) {
      cycleMap.set(
        row.cycleKey,
        row.cycleLabel
      );
    }

    this.filterOptions = {
      cycles: [...cycleMap.entries()]
        .map(([value, label]) => ({
          value,
          label
        }))
        .sort((a, b) =>
          b.value.localeCompare(a.value)
        ),

      types: [
        ...new Set(
          this.allRows
            .map(row => row.type)
            .filter(Boolean)
        )
      ].sort(),

      statuses: [
        ...new Set(
          this.allRows
            .map(row => row.tlStatus)
            .filter(Boolean)
        )
      ].sort()
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
}