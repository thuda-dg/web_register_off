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
import { RegistrationService } from '../../core/services/registration.service';
import { BootstrapData, RegistrationEntryRequest } from '../../core/models/registration.model';

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
  private readonly registrationService =
  inject(RegistrationService);

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
  bootstrapData: BootstrapData | null = null;

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

    // this.api.checkAlreadySubmitted(this.employee.eid, this.calRange.payMonthKey).subscribe(result => {
    //   this.doneEntries = result?.entries || [];
    //   this.offSubmitDone = !!result?.hasOff || this.doneEntries.some((entry: any) => entry.type === 'OFF');
    // });
    this.loadSlotStatus();
    this.loadRegistrationBootstrap();
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

  const localEntries =
    this.selectedDates.map(
      date => this.entryByDate[date]
    );

  if (!localEntries.length) {
    this.showError(
      'Vui lòng chọn ít nhất 1 ngày.'
    );

    return;
  }

  if (
    localEntries.some(
      entry => !entry?.type
    )
  ) {
    this.showError(
      'Vui lòng chọn loại nghỉ cho tất cả các ngày.'
    );

    return;
  }

  if (
    localEntries.some(
      entry =>
        this.typeNeedsReason(entry.type) &&
        !entry.reason
    )
  ) {
    this.showError(
      'Loại A hoặc A/2 bắt buộc phải chọn lý do.'
    );

    return;
  }

  if (!this.bootstrapData) {
    this.showError(
      'Dữ liệu đăng ký chưa tải xong. Vui lòng thử lại.'
    );

    return;
  }

  const entries =
    this.buildRegistrationPayload();

  const missingReasonId =
    entries.some(entry =>
      this.typeNeedsReason(
        entry.leaveTypeCode
      ) &&
      !entry.reasonId
    );

  if (missingReasonId) {
    this.showError(
      'Không xác định được lý do nghỉ. Vui lòng chọn lại lý do.'
    );

    return;
  }

  this.submitting = true;

  this.registrationService
    .validateRegistration({
      cycleId:
        this.bootstrapData.cycle.cycleId,

      entries
    })
    .subscribe({
      next: response => {
        this.submitting = false;

        if (!response.valid) {
          this.showValidationErrors(
            response.errors
          );

          return;
        }

        this.pendingEntries =
          localEntries;

        this.warnings = [];
        this.teamleadRequired = true;

        this.confirmOpen = true;
      },

      error: error => {
        this.submitting = false;

        const validationErrors =
          error.error?.errors;

        if (
          Array.isArray(validationErrors) &&
          validationErrors.length
        ) {
          this.showValidationErrors(
            validationErrors
          );

          return;
        }

        this.showError(
          error.error?.message ||
          'Không thể kiểm tra đăng ký.'
        );
      }
    });
}

  doSubmit(): void {
  if (!this.bootstrapData) {
    this.showError(
      'Dữ liệu kỳ đăng ký chưa sẵn sàng.'
    );

    return;
  }

  const entries =
    this.buildRegistrationPayload();

  this.submitting = true;

  this.registrationService
    .submitRegistration({
      cycleId:
        this.bootstrapData.cycle.cycleId,

      entries
    })
    .subscribe({
      next: response => {
        this.submitting = false;
        this.confirmOpen = false;

        this.successMessage =
          `Đăng ký thành công ${response.data.entryCount} ngày. ` +
          'Yêu cầu đang chờ Team Lead duyệt.';

        this.doneEntries = [
          ...this.doneEntries,
          ...response.data.entries
        ];

        const submittedOff =
          entries.some(
            entry =>
              entry.leaveTypeCode ===
              'OFF'
          );

        if (submittedOff) {
          this.offSubmitDone = true;
        }

        this.selectedDates = [];
        this.entryByDate = {};
        this.pendingEntries = [];

        this.renderCalendar();
        this.loadSlotStatus();

        this.loadRegistrationBootstrap();
      },

      error: error => {
        this.submitting = false;
        this.confirmOpen = false;

        const validationErrors =
          error.error?.errors;

        if (
          Array.isArray(validationErrors) &&
          validationErrors.length
        ) {
          this.showValidationErrors(
            validationErrors
          );

          return;
        }

        this.showError(
          error.error?.message ||
          'Không thể gửi đăng ký.'
        );
      }
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

  private loadRegistrationBootstrap(): void {
  this.registrationService
    .getBootstrap(2)
    .subscribe({
      next: response => {
        this.bootstrapData =
          response.data;

        console.log(
          'Registration bootstrap:',
          response.data
        );
      },

      error: error => {
        console.error(
          'Registration bootstrap error:',
          error
        );

        this.showError(
          error.error?.message ||
          'Không thể tải dữ liệu đăng ký từ backend.'
        );
      }
    });
}

private buildRegistrationPayload():
  RegistrationEntryRequest[] {
  return this.selectedDates.map(date => {
    const currentEntry =
      this.entryByDate[date];

    return {
      leaveDate: date,

      leaveTypeCode:
        currentEntry.type,

      reasonId:
        this.findReasonId(
          currentEntry.type,
          currentEntry.reason
        )
    };
  });
}

private findReasonId(
  leaveTypeCode: string,
  selectedReason: string
): number | null {
  if (!selectedReason) {
    return null;
  }

  const leaveType =
    this.bootstrapData?.leaveTypes.find(
      item =>
        item.leaveTypeCode ===
        leaveTypeCode
    );

  if (!leaveType) {
    return null;
  }

  const reason =
    leaveType.reasons.find(
      item =>
        item.reasonName ===
          selectedReason ||
        String(item.reasonId) ===
          String(selectedReason)
    );

  return reason?.reasonId ?? null;
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

  private showValidationErrors(
  errors: Array<{
    code?: string;
    message?: string;
    leaveDate?: string;
  }>
): void {
  if (!errors?.length) {
    this.showError(
      'Dữ liệu đăng ký không hợp lệ.'
    );

    return;
  }

  this.errorMessage =
    errors
      .map(error => {
        if (error.message) {
          return error.message;
        }

        return error.code ||
          'Dữ liệu không hợp lệ.';
      })
      .join(' ');
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
