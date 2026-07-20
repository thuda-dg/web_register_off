import { Component, Input } from '@angular/core';

import {PublishedScheduleSummary} from '../../../../core/models/published-schedule.models';

@Component({
  selector: 'app-published-summary',
  standalone: true,
  templateUrl: './published-summary.html'
})
export class PublishedSummary {
  @Input({ required: true })
  summary!: PublishedScheduleSummary;
}