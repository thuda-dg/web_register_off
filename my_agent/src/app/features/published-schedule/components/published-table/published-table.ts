import { Component, Input } from '@angular/core';
import {PublishedScheduleRow} from '../../../../core/models/published-schedule.models';

@Component({
  selector: 'app-published-table',
  standalone: true,
  templateUrl: './published-table.html'
})
export class PublishedTable {
  @Input({ required: true })
  rows: PublishedScheduleRow[] = [];

  getTypeClasses(type: string): string {
    const classes: Record<string, string> = {
      OFF: 'bg-emerald-600 text-white',
      U: 'bg-slate-500 text-white',
      'U/2': 'bg-slate-400 text-white',
      R: 'bg-red-500 text-white',
      X: 'bg-slate-300 text-slate-700',
      A: 'bg-blue-600 text-white',
      'A/2': 'bg-blue-400 text-white',
      S: 'bg-purple-600 text-white',
      H: 'bg-teal-600 text-white',
      M: 'bg-orange-500 text-white'
    };

    return classes[type] ?? 'bg-slate-500 text-white';
  }
}