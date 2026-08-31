import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { Schedule } from './features/schedule/schedule';
import { History } from './features/history/history';
import {PublishedSchedule} from './features/published-schedule/published-schedule';
import { RequireHc } from './features/require-hc/require-hc';

type TabName =
  | 'schedule'
  | 'history'
  | 'public'
  | 'require';

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
export class App {
  activeTab: TabName = 'schedule';

  switchTab(tab: TabName): void {
    this.activeTab = tab;
  }
}