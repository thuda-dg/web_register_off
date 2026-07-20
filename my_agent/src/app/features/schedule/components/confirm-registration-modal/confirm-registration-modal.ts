import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-registration-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-registration-modal.html',
})
export class ConfirmRegistrationModal {
  @Input() open = false;
  @Input() warnings: string[] = [];
  @Input() teamleadRequired = false;
  @Input() submitting = false;

  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();
}
