import {Component,EventEmitter,Input,Output} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {RequireHcFilterOptions,RequireHcFiltersValue} from '../../../../core/models/require-hc.models';

@Component({
  selector: 'app-require-hc-filters',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './require-hc-filters.html'
})
export class RequireHcFiltersComponent {
  @Input({ required: true })
  options!: RequireHcFilterOptions;

  @Input({ required: true })
  value!: RequireHcFiltersValue;

  @Output()
  valueChange =
    new EventEmitter<RequireHcFiltersValue>();

  updateFilter(
    key: keyof RequireHcFiltersValue,
    value: string
  ): void {
    this.valueChange.emit({
      ...this.value,
      [key]: value
    });
  }
}