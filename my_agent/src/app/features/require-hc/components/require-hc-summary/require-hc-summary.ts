import { Component, Input } from '@angular/core';

import { RequireHcSummary} from '../../../../core/models/require-hc.models';

@Component({
  selector: 'app-require-hc-summary',
  standalone: true,
  templateUrl: './require-hc-summary.html'
})
export class RequireHcSummaryComponent {
  @Input({ required: true })
  summary!: RequireHcSummary;
}