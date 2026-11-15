import { finalize, Subscription } from 'rxjs';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import {RequireHcFilterOptions,RequireHcFiltersValue,RequireHcRow,RequireHcSummary} from '../../core/models/require-hc.models';
import {RequireHcService} from '../../core/services/require-hc.service';
import {RequireHcSummaryComponent} from './components/require-hc-summary/require-hc-summary';
import {RequireHcFiltersComponent} from './components/require-hc-filters/require-hc-filters';
import {RequireHcTableComponent} from './components/require-hc-table/require-hc-table';

@Component({
  selector: 'app-require-hc',
  standalone: true,
  imports: [
    RequireHcSummaryComponent,
    RequireHcFiltersComponent,
    RequireHcTableComponent
  ],
  templateUrl: './require-hc.html'
})
export class RequireHc implements OnInit, OnDestroy {
  private request?: Subscription;
  loading = false;
  errorMessage = '';

  allRows: RequireHcRow[] = [];
  filteredRows: RequireHcRow[] = [];

  filters: RequireHcFiltersValue = {
    cycle: '',
    task: '',
    status: ''
  };

  filterOptions: RequireHcFilterOptions = {
    cycles: [],
    tasks: [],
    statuses: [
      'available',
      'full'
    ]
  };

  summary: RequireHcSummary = {
    totalDays: 0,
    fullDays: 0,
    availableDays: 0,
    remainingSlots: 0
  };

  constructor(
    private readonly service: RequireHcService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRequireHc();
  }

  loadRequireHc(): void {
    if (this.loading) return;
    this.loading = true;
    this.errorMessage = '';

    this.request = this.service
      .getRequireHc()
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: response => {
          this.loading = false;

          if (!response.ok) {

            this.errorMessage =
              response.msg ??
              'Không tải được dữ liệu RequireHC.';

            return;
          }

          this.allRows = response.rows ?? [];

          this.buildFilterOptions();
          this.applyFilters();
        },

        error: () => {
          this.loading = false;

          this.errorMessage =
            'Có lỗi xảy ra khi tải dữ liệu RequireHC.';
        }
      });
  }

  onFiltersChange(
    filters: RequireHcFiltersValue
  ): void {
    this.filters = { ...filters };
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredRows = this.allRows.filter(row => {
      const matchesCycle =
        !this.filters.cycle ||
        row.cycleKey === this.filters.cycle;

      const matchesTask =
        !this.filters.task ||
        row.task === this.filters.task;

      const matchesStatus =
        !this.filters.status ||
        (
          this.filters.status === 'full'
            ? row.full
            : !row.full
        );

      return (
        matchesCycle &&
        matchesTask &&
        matchesStatus
      );
    });

    this.summary = {
      totalDays: this.allRows.length,

      fullDays: this.allRows.filter(
        row => row.full
      ).length,

      availableDays: this.allRows.filter(
        row => !row.full
      ).length,

      remainingSlots: this.allRows.reduce(
        (total, row) => total + row.remainingSlot,
        0
      )
    };
    this.cdr.markForCheck();
  }

  private buildFilterOptions(): void {
    const cycleMap = new Map<string, string>();

    for (const row of this.allRows) {
      cycleMap.set(
        row.cycleKey,
        row.cycleLabel
      );
    }

    const previous = this.filterOptions;
    if (this.filters.cycle && !cycleMap.has(this.filters.cycle)) {
      cycleMap.set(this.filters.cycle, previous.cycles.find(option => option.value === this.filters.cycle)?.label || this.filters.cycle);
    }
    const tasks = new Set(this.allRows.map(row => row.task));
    if (this.filters.task) tasks.add(this.filters.task);
    this.filterOptions = {
      cycles: [...cycleMap.entries()]
        .map(([value, label]) => ({
          value,
          label
        }))
        .sort((a, b) =>
          b.value.localeCompare(a.value)
        ),

      tasks: [...tasks].sort(),

      statuses: [
        'available',
        'full'
      ]
    };
  }

  ngOnDestroy(): void { this.request?.unsubscribe(); }
}
