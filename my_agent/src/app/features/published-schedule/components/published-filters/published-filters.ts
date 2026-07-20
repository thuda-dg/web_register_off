import {Component, EventEmitter, Input, Output} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {PublishedScheduleFilterOptions, PublishedScheduleFiltersValue} from '../../../../core/models/published-schedule.models';

@Component({
  selector: 'app-published-filters',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './published-filters.html'
})
export class PublishedFilters {
  @Input({ required: true })
  options!: PublishedScheduleFilterOptions;

  @Input({ required: true })
  value!: PublishedScheduleFiltersValue;

  @Output()
  valueChange =
    new EventEmitter<PublishedScheduleFiltersValue>();

  updateFilter(
    key: keyof PublishedScheduleFiltersValue,
    value: string
  ): void {
    this.valueChange.emit({
      ...this.value,
      [key]: value
    });
  }
}