import { Component, Input } from '@angular/core';
import { HistorySummary } from '../../../../core/models/history.models';

@Component({ selector:'app-history-summary', standalone:true, templateUrl:'./history-summary.html' })
export class HistorySummaryComponent { @Input({ required:true }) summary!: HistorySummary; }
