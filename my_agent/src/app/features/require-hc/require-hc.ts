import { Component, OnInit } from '@angular/core';
import {RequireHcFilterOptions,RequireHcFiltersValue,RequireHcRow,RequireHcSummary} from '../../core/models/require-hc.models';
import {RequireHcMockService} from '../../core/services/require-hc-mock';
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
export class RequireHc implements OnInit {
  loading = false;
  errorMessage = '';

  allRows: RequireHcRow[] = [];
  filteredRows: RequireHcRow[] = [];

  filters: RequireHcFiltersValue = {
    cycle: '',
    task: '',
    team: '',
    status: ''
  };

  filterOptions: RequireHcFilterOptions = {
    cycles: [],
    tasks: [],
    teams: [],
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
    private readonly service: RequireHcMockService
  ) {}

  ngOnInit(): void {
    this.loadRequireHc();
  }

  loadRequireHc(): void {
    this.loading = true;
    this.errorMessage = '';

    this.service
      .getRequireHc()
      .subscribe({
        next: response => {
          this.loading = false;

          if (!response.ok) {
            this.reset();

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
          this.reset();

          this.errorMessage =
            'Có lỗi xảy ra khi tải dữ liệu RequireHC.';
        }
      });
  }

  onFiltersChange(
    filters: RequireHcFiltersValue
  ): void {
    this.filters = filters;
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

      const matchesTeam =
        !this.filters.team ||
        row.team === this.filters.team;

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
        matchesTeam &&
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

      tasks: [
        ...new Set(
          this.allRows.map(row => row.task)
        )
      ].sort(),

      teams: [
        ...new Set(
          this.allRows.map(row => row.team)
        )
      ].sort(),

      statuses: [
        'available',
        'full'
      ]
    };
  }

  private reset(): void {
    this.allRows = [];
    this.filteredRows = [];

    this.summary = {
      totalDays: 0,
      fullDays: 0,
      availableDays: 0,
      remainingSlots: 0
    };

    this.filterOptions = {
      cycles: [],
      tasks: [],
      teams: [],
      statuses: [
        'available',
        'full'
      ]
    };
  }
}