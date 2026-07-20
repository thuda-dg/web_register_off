import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LeaveType, RegistrationEntry } from '../../../../core/models/wfm.models';

@Component({
  selector: 'app-selected-date-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './selected-date-list.html',
})
export class SelectedDateList {
  @Input() selectedDates: string[] = [];
  @Input() entries: Record<string, RegistrationEntry> = {};
  @Input() leaveTypes: LeaveType[] = [];
  @Input() reasonMap: Record<string, string[]> = {};

  @Output() typeChanged = new EventEmitter<string>();
  @Output() dateRemoved = new EventEmitter<string>();

  fmt(date: string): string {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }

  reasonsFor(type: string): string[] {
    if (type && this.reasonMap[type]?.length) return this.reasonMap[type];
    return [...new Set(Object.values(this.reasonMap).flat())];
  }

  needsReason(type: string): boolean {
    return !!this.leaveTypes.find(item => item.value === type)?.needReason;
  }
}
