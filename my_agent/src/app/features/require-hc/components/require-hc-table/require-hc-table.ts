import { Component, Input } from '@angular/core';
import {RequireHcRow} from '../../../../core/models/require-hc.models';

@Component({
  selector: 'app-require-hc-table',
  standalone: true,
  templateUrl: './require-hc-table.html'
})
export class RequireHcTableComponent {
  @Input({ required: true })
  rows: RequireHcRow[] = [];

  getRemainingSlotClasses(row: RequireHcRow): string {
    if (row.full || row.remainingSlot <= 0) {
      return 'bg-red-100 text-red-800';
    }

    if (row.remainingSlot === 1) {
      return 'bg-orange-100 text-orange-800';
    }

    return 'bg-emerald-100 text-emerald-800';
  }

  getStatusText(row: RequireHcRow): string {
    return row.full || row.remainingSlot <= 0
      ? 'Đã đủ'
      : 'Còn slot';
  }
}