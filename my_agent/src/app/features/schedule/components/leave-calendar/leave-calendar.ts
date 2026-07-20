import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarCell } from '../../../../core/models/wfm.models';

@Component({
  selector: 'app-leave-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-calendar.html',
})
export class LeaveCalendar {
  @Input() cells: CalendarCell[] = [];
  @Input() monthOptions: Array<{ value: string; label: string }> = [];
  @Input() currentMonthValue = '';
  @Input() rangeLabel = '';

  @Output() monthValueChange = new EventEmitter<string>();
  @Output() moveMonth = new EventEmitter<number>();
  @Output() dateToggle = new EventEmitter<CalendarCell>();

  readonly weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  trackCell(_index: number, cell: CalendarCell): string {
    return cell.key;
  }
}
