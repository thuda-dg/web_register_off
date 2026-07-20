import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { forkJoin } from 'rxjs';

import { CalendarRange, Employee } from './core/models/wfm.models';
import { WfmApiService } from './core/services/wfm-api.service';

import { Schedule } from './features/schedule/schedule';
import { History } from './features/history/history';
import {PublishedSchedule} from './features/published-schedule/published-schedule';
import { RequireHc } from './features/require-hc/require-hc';

type TabName = 'schedule' | 'history' | 'public' | 'require';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    Schedule,
    History,
    PublishedSchedule,
    RequireHc
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly api = inject(WfmApiService);

  activeTab: TabName = 'schedule';

  loading = true;
  employee: Employee | null = null;
  calRange: CalendarRange | null = null;
  reasonMap: Record<string, string[]> = {};
  errorMessage = '';

  ngOnInit(): void {
    forkJoin({
      employee: this.api.getAuthenticatedUserInfo(),
      range: this.api.getCalendarRange(),
      reasons: this.api.getReasons(),
    }).subscribe({
      next: ({ employee, range, reasons }) => {
        this.employee =
          employee.status === 'success'
            ? employee
            : null;

        this.calRange = range;
        this.reasonMap = reasons;

        this.errorMessage = this.employee
          ? ''
          : employee.message || 'Không xác thực được tài khoản.';

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Không thể tải dữ liệu frontend mẫu.';
      },
    });
  }

  switchTab(tab: TabName): void {
    this.activeTab = tab;
  }
}