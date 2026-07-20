import { Component, OnInit } from '@angular/core';
import {PublishedScheduleFilterOptions,PublishedScheduleFiltersValue,PublishedScheduleRow,PublishedScheduleSummary} from '../../core/models/published-schedule.models';
import {PublishedScheduleMockService} from '../../core/services/published-schedule-mock';
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
export class PublishedSchedule implements OnInit {
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
    private readonly service: PublishedScheduleMockService
  ) {}

  ngOnInit(): void {
    this.loadPublishedSchedule();
  }

  loadPublishedSchedule(): void {
    this.loading = true;
    this.errorMessage = '';

    this.service
      .getPublishedSchedule()
      .subscribe({
        next: response => {
          this.loading = false;

          if (!response.ok) {
            this.reset();

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
          this.reset();

          this.errorMessage =
            'Có lỗi xảy ra khi tải lịch nghỉ đã chốt.';
        }
      });
  }

  onFiltersChange(
    filters: PublishedScheduleFiltersValue
  ): void {
    this.filters = filters;
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

      teams: [
        ...new Set(
          this.allRows.map(row => row.team)
        )
      ].sort(),

      types: [
        ...new Set(
          this.allRows.map(row => row.type)
        )
      ].sort()
    };
  }

  private reset(): void {
    this.allRows = [];
    this.filteredRows = [];

    this.filterOptions = {
      cycles: [],
      teams: [],
      types: []
    };

    this.summary = {
      total: 0,
      teams: 0,
      cycles: 0,
      shown: 0
    };
  }
}