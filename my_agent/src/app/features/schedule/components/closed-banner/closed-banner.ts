import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-closed-banner',
  standalone: true,
  templateUrl: './closed-banner.html',
})
export class ClosedBanner {
  @Input() nextOpenDate = '...';
}
