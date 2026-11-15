import { finalize, Subscription } from 'rxjs';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import {PublishedScheduleFilterOptions,PublishedScheduleFiltersValue,PublishedScheduleRow,PublishedScheduleSummary} from '../../core/models/published-schedule.models';
import {PublishedScheduleService} from '../../core/services/published-schedule.service';
import {PublishedFilters} from './components/published-filters/published-filters';
import {PublishedSummary} from './components/published-summary/published-summary';
import {PublishedTable} from './components/published-table/published-table';

@Component({
  selector: 'app-published-schedule',
  standalone: true,
  imports: [
    PublishedSummary,
    PublishedFilters,
    PublishedTable
  ],
  templateUrl: './published-schedule.html'
})
export class PublishedSchedule implements OnInit, OnDestroy {
  private request?: Subscription;
  loading = false;
  errorMessage = '';

  allRows: PublishedScheduleRow[] = [];
  filteredRows: PublishedScheduleRow[] = [];

  filters: PublishedScheduleFiltersValue = {
    cycle: '',
    team: '',
    type: ''
  };

  filterOptions: PublishedScheduleFilterOptions = {
    cycles: [],
    teams: [],
    types: []
  };

  summary: PublishedScheduleSummary = {
    total: 0,
    teams: 0,
    cycles: 0,
    shown: 0
  };

  constructor(
    private readonly service: PublishedScheduleService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPublishedSchedule();
  }

  loadPublishedSchedule(): void {
    if (this.loading) return;
    this.loading = true;
    this.errorMessage = '';

    this.request = this.service
      .getPublishedSchedule()
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: response => {
          this.loading = false;

          if (!response.ok) {

            this.errorMessage =
              response.msg ??
              'Không tải được lịch nghỉ đã chốt.';

            return;
          }

          this.allRows = response.rows ?? [];

          this.buildFilterOptions();
          this.applyFilters();
        },

        error: () => {
          this.loading = false;

          this.errorMessage =
            'Có lỗi xảy ra khi tải lịch nghỉ đã chốt.';
        }
      });
  }

  onFiltersChange(
    filters: PublishedScheduleFiltersValue
  ): void {
    this.filters = { ...filters };
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredRows = this.allRows.filter(row => {
      const matchesCycle =
        !this.filters.cycle ||
        row.cycleKey === this.filters.cycle;

      const matchesTeam =
        !this.filters.team ||
        row.team === this.filters.team;

      const matchesType =
        !this.filters.type ||
        row.type === this.filters.type;

      return (
        matchesCycle &&
        matchesTeam &&
        matchesType
      );
    });

    this.summary = {
      total: this.allRows.length,

      teams: new Set(
        this.allRows.map(row => row.team)
      ).size,

      cycles: new Set(
        this.allRows.map(row => row.cycleKey)
      ).size,

      shown: this.filteredRows.length
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
    const teams = new Set(this.allRows.map(row => row.team));
    const types = new Set(this.allRows.map(row => row.type));
    if (this.filters.team) teams.add(this.filters.team);
    if (this.filters.type) types.add(this.filters.type);
    this.filterOptions = {
      cycles: [...cycleMap.entries()]
        .map(([value, label]) => ({
          value,
          label
        }))
        .sort((a, b) =>
          b.value.localeCompare(a.value)
        ),

      teams: [...teams].sort(),

      types: [...types].sort()
    };
  }

  ngOnDestroy(): void { this.request?.unsubscribe(); }
}
