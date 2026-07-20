import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-done-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './done-banner.html',
})
export class DoneBanner {
  @Input() entries: any[] = [];
  @Input() payMonth = '';

  fmt(date: string): string {
    const [year, month, day] = String(date || '').split('-');
    return day ? `${day}/${month}/${year}` : date;
  }

  color(type: string): string {
    return ({ OFF:'#27ae60', U:'#7f8c8d', 'U/2':'#95a5a6', R:'#e74c3c', X:'#bdc3c7', A:'#1a73e8', 'A/2':'#5b9cf6', S:'#8e44ad', H:'#16a085', M:'#e67e22' } as Record<string,string>)[type] || '#64748b';
  }
}
