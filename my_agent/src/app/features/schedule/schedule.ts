import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import {
  CalendarCell,
  CalendarRange,
  Employee,
  LeaveType,
  RegistrationEntry,
  SlotStatus,
} from '../../core/models/wfm.models';
import { WfmApiService } from '../../core/services/wfm-api.service';
import { LeaveCalendar } from './components/leave-calendar/leave-calendar';
import { SelectedDateList } from './components/selected-date-list/selected-date-list';
import { ConfirmRegistrationModal } from './components/confirm-registration-modal/confirm-registration-modal';
import { ClosedBanner } from './components/closed-banner/closed-banner';
import { DoneBanner } from './components/done-banner/done-banner';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    LeaveCalendar,
    SelectedDateList,
    ConfirmRegistrationModal,
    ClosedBanner,
    DoneBanner,
  ],
  templateUrl: './schedule.html',
})
export class Schedule implements OnChanges {
  private readonly api = inject(WfmApiService);

  @Input({ required: true }) employee!: Employee;
  @Input({ required: true }) calRange!: CalendarRange;
  @Input() reasonMap: Record<string, string[]> = {};

  readonly allTypes: LeaveType[] = [
    { value:'OFF', label:'OFF – Weekoff', needReason:false, color:'#27ae60' },
    { value:'U', label:'U – Unpaid Leave', needReason:false, color:'#7f8c8d' },
    { value:'U/2', label:'U/2 – Half Day Unpaid', needReason:false, color:'#95a5a6' },
    { value:'R', label:'R – Resign', needReason:false, color:'#e74c3c' },
    { value:'X', label:'X – Not Join Yet', needReason:false, color:'#bdc3c7' },
    { value:'A', label:'A – Annual Leave', needReason:true, color:'#1a73e8' },
    { value:'A/2', label:'A/2 – Half Day Annual Leave', needReason:true, color:'#5b9cf6' },
    { value:'S', label:'S – Special Day', needReason:false, color:'#8e44ad' },
    { value:'H', label:'H – Holiday', needReason:false, color:'#16a085' },
    { value:'M', label:'M – Medical (Sick Leave)', needReason:false, color:'#e67e22' },
  ];

  selectedDates: string[] = [];
  entryByDate: Record<string, RegistrationEntry> = {};
  slotStatus: Record<string, SlotStatus> = {};
  calendarCells: CalendarCell[] = [];
  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth();
  offSubmitDone = false;
  doneEntries: any[] = [];
  pendingEntries: RegistrationEntry[] = [];
  warnings: string[] = [];
  teamleadRequired = false;
  confirmOpen = false;
  submitting = false;
  initialized = false;
  errorMessage = '';
  successMessage = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.employee || !this.calRange?.startDate) return;
    if (!this.initialized || changes['employee'] || changes['calRange']) {
      this.initializeSchedule();
    }
  }

  get canBypassTime(): boolean {
    return !!(this.employee.canBypassTime || this.employee.isOwner || this.employee.isTester);
  }

  get formClosed(): boolean {
    return !this.calRange.regOpen.open && !this.canBypassTime;
  }

  get typesShown(): LeaveType[] {
    return this.offSubmitDone
      ? this.allTypes.filter(type => type.value !== 'OFF')
      : this.allTypes.filter(type => type.value === 'OFF');
  }

  get selectedDatesText(): string {
    return this.selectedDates.length ? this.selectedDates.map(date => this.fmt(date)).join(' • ') : '— Chưa chọn ngày nào —';
  }

  get monthOptions(): Array<{ value: string; label: string }> {
    const result: Array<{ value: string; label: string }> = [];
    const cursor = new Date(`${this.calRange.startDate}T00:00:00`);
    cursor.setDate(1);
    const end = new Date(`${this.calRange.endDate}T00:00:00`);
    end.setDate(1);
    while (cursor <= end) {
      result.push({
        value: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        label: `Tháng ${cursor.getMonth() + 1}/${cursor.getFullYear()}`,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
  }

  get currentMonthValue(): string {
    return `${this.viewYear}-${this.viewMonth}`;
  }

  initializeSchedule(): void {
    this.initialized = true;
    const start = new Date(`${this.calRange.startDate}T00:00:00`);
    this.viewYear = start.getFullYear();
    this.viewMonth = start.getMonth();
    this.renderCalendar();

    this.api.checkAlreadySubmitted(this.employee.eid, this.calRange.payMonthKey).subscribe(result => {
      this.doneEntries = result?.entries || [];
      this.offSubmitDone = !!result?.hasOff || this.doneEntries.some((entry: any) => entry.type === 'OFF');
    });
    this.loadSlotStatus();
  }

  setMonth(value: string): void {
    const [year, month] = value.split('-').map(Number);
    this.viewYear = year;
    this.viewMonth = month;
    this.renderCalendar();
  }

  moveMonth(delta: number): void {
    const next = new Date(this.viewYear, this.viewMonth + delta, 1);
    const nextValue = `${next.getFullYear()}-${next.getMonth()}`;
    if (!this.monthOptions.some(option => option.value === nextValue)) return;
    this.viewYear = next.getFullYear();
    this.viewMonth = next.getMonth();
    this.renderCalendar();
  }

  renderCalendar(): void {
    const cells: CalendarCell[] = [];
    const firstDay = new Date(this.viewYear, this.viewMonth, 1).getDay();
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    for (let index = 0; index < firstDay; index++) cells.push({ key: `empty-${index}`, empty: true });

    const today = this.dateStr(new Date());
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${this.viewYear}-${this.pad(this.viewMonth + 1)}-${this.pad(day)}`;
      const inRange = date >= this.calRange.startDate && date <= this.calRange.endDate;
      cells.push({
        key: date,
        day,
        inRange,
        selected: this.selectedDates.includes(date),
        today: date === today,
        full: !!this.slotStatus[date]?.full,
      });
    }
    this.calendarCells = cells;
  }

  toggleDate(cell: CalendarCell): void {
    if (!cell.day || !cell.inRange || cell.full) return;
    const date = cell.key;
    if (this.selectedDates.includes(date)) {
      this.removeDate(date);
      return;
    }
    this.selectedDates = [...this.selectedDates, date].sort();
    this.entryByDate[date] = { date, type: '', reason: '' };
    this.renderCalendar();
  }

  removeDate(date: string): void {
    this.selectedDates = this.selectedDates.filter(item => item !== date);
    delete this.entryByDate[date];
    this.renderCalendar();
  }

  onTypeChange(date: string): void {
    this.entryByDate[date].reason = '';
  }

  submit(): void {
    this.clearMessages();
    const entries = this.selectedDates.map(date => this.entryByDate[date]);
    if (!entries.length) return this.showError('Vui lòng chọn ít nhất 1 ngày.');
    if (entries.some(entry => !entry?.type)) return this.showError('Vui lòng chọn loại nghỉ cho tất cả các ngày.');
    if (entries.some(entry => this.typeNeedsReason(entry.type) && !entry.reason)) {
      return this.showError('Loại A hoặc A/2 bắt buộc phải chọn lý do.');
    }

    this.submitting = true;
    this.api.validateEntries({ eid: this.employee.eid, entries }).subscribe({
      next: result => {
        this.submitting = false;
        if (!result?.ok) return this.showError(result?.msg || 'Dữ liệu đăng ký không hợp lệ.');
        this.pendingEntries = entries;
        this.warnings = result.warnings || [];
        this.teamleadRequired = !!result.teamleadRequired;
        if (this.warnings.length) this.confirmOpen = true;
        else this.doSubmit();
      },
      error: () => {
        this.submitting = false;
        this.showError('Không thể kiểm tra đăng ký.');
      },
    });
  }

  doSubmit(): void {
    this.submitting = true;
    this.api.submitRegistration({ eid: this.employee.eid, entries: this.pendingEntries }).subscribe({
      next: result => {
        this.submitting = false;
        this.confirmOpen = false;
        if (!result?.ok) return this.showError(result?.msg || 'Đăng ký thất bại.');
        this.successMessage = `Đăng ký thành công ${this.pendingEntries.length} ngày. Yêu cầu đang chờ Team Lead duyệt.`;
        this.offSubmitDone = true;
        this.doneEntries = [...this.doneEntries, ...(result.rows || [])];
        this.selectedDates = [];
        this.entryByDate = {};
        this.pendingEntries = [];
        this.loadSlotStatus();
      },
      error: () => {
        this.submitting = false;
        this.confirmOpen = false;
        this.showError('Không thể gửi đăng ký.');
      },
    });
  }

  closeConfirm(): void {
    if (this.submitting) return;
    this.confirmOpen = false;
    this.pendingEntries = [];
  }

  private loadSlotStatus(): void {
    this.api.getDaySlotStatus(this.employee.task).subscribe(status => {
      this.slotStatus = status || {};
      this.selectedDates = this.selectedDates.filter(date => !this.slotStatus[date]?.full);
      this.renderCalendar();
    });
  }

  private typeNeedsReason(type: string): boolean {
    return !!this.allTypes.find(item => item.value === type)?.needReason;
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private showError(message: string): void {
    this.errorMessage = message;
  }

  fmt(date: string): string {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }

  private dateStr(date: Date): string {
    return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())}`;
  }

  private pad(value: number): string {
    return String(value).padStart(2, '0');
  }


}
