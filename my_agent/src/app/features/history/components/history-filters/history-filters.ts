import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HistoryFilterOptions, HistoryFiltersValue } from '../../../../core/models/history.models';

@Component({ selector:'app-history-filters', standalone:true, imports:[FormsModule], templateUrl:'./history-filters.html' })
export class HistoryFiltersComponent {
  @Input({ required:true }) options!: HistoryFilterOptions;
  @Input({ required:true }) value!: HistoryFiltersValue;
  @Output() valueChange = new EventEmitter<HistoryFiltersValue>();
  updateFilter(
    key: keyof HistoryFiltersValue,
    nextValue: string
  ): void {

    const newValue = {
      cycle: this.value?.cycle ?? 'ALL',
      type: this.value?.type ?? 'ALL',
      status: this.value?.status ?? 'ALL',
      [key]: nextValue || 'ALL'
    };

    console.log(
      'FILTER EMIT',
      newValue
    );

    this.valueChange.emit(newValue);
  }
}
