import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import {
  CalendarCell,
  Employee,
  LeaveType,
  RegistrationEntry,
  SlotStatus,
} from '../../core/models/wfm.models';

import { WfmApiService } from '../../core/services/wfm-api.service';
import { RegistrationService } from '../../core/services/registration.service';
import { AuthService } from '../../core/services/auth.service';
import {
  BootstrapData,
  RegistrationEntryRequest
} from '../../core/models/registration.model';

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
    DoneBanner
  ],
  templateUrl: './schedule.html'
})
export class Schedule {

  private readonly api = inject(WfmApiService);
  private readonly registrationService = inject(RegistrationService);
  private readonly authService = inject(AuthService);

  // =========================================================
  // DATA
  // =========================================================

  bootstrapData: BootstrapData | null = null;

  employee: Employee | null = null;

  selectedDates: string[] = [];

  entryByDate: Record<string, RegistrationEntry> = {};

  slotStatus: Record<string, SlotStatus> = {};

  calendarCells: CalendarCell[] = [];

  doneEntries: any[] = [];

  pendingEntries: RegistrationEntry[] = [];

  warnings: string[] = [];

  // =========================================================
  // UI STATE
  // =========================================================

  offSubmitDone = false;

  teamleadRequired = false;

  confirmOpen = false;

  submitting = false;

  initialized = false;

  loading = true;

  errorMessage = '';

  successMessage = '';

  // =========================================================
  // CALENDAR STATE
  // =========================================================

  viewYear = new Date().getFullYear();

  viewMonth = new Date().getMonth();

  // =========================================================
  // LEAVE TYPES
  // =========================================================

  readonly allTypes: LeaveType[] = [
    {
      value: 'OFF',
      label: 'OFF – Weekoff',
      needReason: false,
      color: '#27ae60'
    },
    {
      value: 'U',
      label: 'U – Unpaid Leave',
      needReason: false,
      color: '#7f8c8d'
    },
    {
      value: 'U/2',
      label: 'U/2 – Half Day Unpaid',
      needReason: false,
      color: '#95a5a6'
    },
    {
      value: 'R',
      label: 'R – Resign',
      needReason: false,
      color: '#e74c3c'
    },
    {
      value: 'X',
      label: 'X – Not Join Yet',
      needReason: false,
      color: '#bdc3c7'
    },
    {
      value: 'A',
      label: 'A – Annual Leave',
      needReason: true,
      color: '#1a73e8'
    },
    {
      value: 'A/2',
      label: 'A/2 – Half Day Annual Leave',
      needReason: true,
      color: '#5b9cf6'
    },
    {
      value: 'S',
      label: 'S – Special Day',
      needReason: false,
      color: '#8e44ad'
    },
    {
      value: 'H',
      label: 'H – Holiday',
      needReason: false,
      color: '#16a085'
    },
    {
      value: 'M',
      label: 'M – Medical (Sick Leave)',
      needReason: false,
      color: '#e67e22'
    }
  ];

  // =========================================================
  // COMPUTED UI
  // =========================================================

  /**
   * Chuẩn hóa giá trị isRegistrationOpen từ API.
   * Bình thường backend trả boolean, nhưng normalize ở đây giúp UI
   * không bị sai nếu dữ liệu tạm thời là 1/0 hoặc "true"/"false".
   */
  get isRegistrationOpen(): boolean {
    if (!this.bootstrapData) {
      return false;
    }

    return this.toBoolean(
      this.bootstrapData.cycle.isRegistrationOpen
    );
  }

  get formClosed(): boolean {
    // Chưa tải bootstrap xong thì chưa kết luận kỳ đã đóng.
    if (!this.bootstrapData) {
      return false;
    }

    // Backend là nguồn quyết định chính cho trạng thái mở/đóng.
    return !this.isRegistrationOpen;
  }

  get nextOpenDate(): string {
    // Backend Bootstrap hiện tại chưa trả nextOpenDate.
    return '...';
  }

  get canBypassTime(): boolean {
    // Bootstrap hiện tại chưa trả quyền bypass.
    // Không dùng field này để override isRegistrationOpen.
    return false;
  }

  get calRange() {
    // Template đang truy cập trực tiếp calRange.payMonth/regOpen,
    // vì vậy trả object an toàn trong lúc bootstrap chưa tải xong
    // thay vì trả null.
    if (!this.bootstrapData) {
      const today = this.dateStr(new Date());

      return {
        startDate: today,
        endDate: today,
        payMonth: '...',
        regOpen: {
          open: false,
          nextOpenDate: this.nextOpenDate
        }
      };
    }

    return {
      startDate: this.bootstrapData.cycle.startDate,
      endDate: this.bootstrapData.cycle.endDate,

      payMonth: this.bootstrapData.cycle.cycleName,

      regOpen: {
        open: this.isRegistrationOpen,
        nextOpenDate: this.nextOpenDate
      }
    };
  }

  get typesShown(): LeaveType[] {
    if (this.offSubmitDone) {
      return this.allTypes.filter(
        type => type.value !== 'OFF'
      );
    }

    return this.allTypes.filter(
      type => type.value === 'OFF'
    );
  }
  get reasonMap(): Record<string, string[]> {
  if (!this.bootstrapData) {
    return {};
  }

  const result: Record<string, string[]> = {};

  for (const leaveType of this.bootstrapData.leaveTypes) {
    result[leaveType.leaveTypeCode] =
      leaveType.reasons.map(
        reason => reason.reasonName
      );
  }

  return result;
}

  get selectedDatesText(): string {
    return this.selectedDates.length
      ? this.selectedDates
          .map(date => this.fmt(date))
          .join(' • ')
      : '— Chưa chọn ngày nào —';
  }

  get monthOptions(): Array<{
    value: string;
    label: string;
  }> {

    if (!this.bootstrapData) {
      return [];
    }

    const result: Array<{
      value: string;
      label: string;
    }> = [];

    const cursor = new Date(
      `${this.bootstrapData.cycle.startDate}T00:00:00`
    );

    cursor.setDate(1);

    const end = new Date(
      `${this.bootstrapData.cycle.endDate}T00:00:00`
    );

    end.setDate(1);

    while (cursor <= end) {

      result.push({
        value: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        label: `Tháng ${
          cursor.getMonth() + 1
        }/${cursor.getFullYear()}`
      });

      cursor.setMonth(
        cursor.getMonth() + 1
      );
    }

    return result;
  }

  get currentMonthValue(): string {
    return `${this.viewYear}-${this.viewMonth}`;
  }

  // =========================================================
  // INIT
  // =========================================================

  constructor() {
    this.loadRegistrationBootstrap();
  }

  private loadRegistrationBootstrap(): void {
  this.loading = true;
  this.clearMessages();

  this.registrationService
    .getBootstrap()
    .subscribe({
      next: response => {

        if (!response?.ok || !response.data) {
          this.loading = false;

          this.showError(
            response?.message ||
            'Không thể tải dữ liệu đăng ký.'
          );

          return;
        }

        const data = response.data;

        // ==========================================
        // Lưu toàn bộ bootstrap data
        // ==========================================

        this.bootstrapData = data;

        // Debug rõ trạng thái kỳ đăng ký ngay khi API trả về.
        // Sau khi xác định xong nguyên nhân có thể bỏ hàm log này.
        this.debugRegistrationBootstrap(data);

        // ==========================================
        // Map BootstrapData -> Employee
        // ==========================================

        this.employee = {
          status: data.cycle.status,

          name: data.employee.empName,

          eid: data.employee.empCode,

          email: data.employee.empEmail,

          task: data.task.taskCode,

          team: data.team.teamCode,

          alRemain:
            data.balances.annualLeave.remaining,

          offRemain:
            data.balances.off.remaining,

          isOwner: false,

          isTester: false,

          isTeamLead: false,

          canBypassTime: false
        };

        // ==========================================
        // Calendar
        // ==========================================

        const start = new Date(
          `${data.cycle.startDate}T00:00:00`
        );

        this.viewYear =
          start.getFullYear();

        this.viewMonth =
          start.getMonth();

        this.initialized = true;

        this.renderCalendar();

        // ==========================================
        // Load slot status
        // ==========================================

        this.loadSlotStatus();

        console.log(
          '[Schedule] Mapped employee:',
          this.employee
        );

        console.log(
          '[Schedule] formClosed:',
          this.formClosed
        );

        this.loading = false;
      },

      error: error => {

        console.error(
          'Registration bootstrap error:',
          error
        );

        this.loading = false;

        this.showError(
          error?.error?.message ||
          'Không thể tải dữ liệu đăng ký từ backend.'
        );
      }
    });
}

  // =========================================================
  // CALENDAR
  // =========================================================

  setMonth(value: string): void {

    const [year, month] =
      value.split('-').map(Number);

    this.viewYear = year;

    this.viewMonth = month;

    this.renderCalendar();
  }

  moveMonth(delta: number): void {

    const next = new Date(
      this.viewYear,
      this.viewMonth + delta,
      1
    );

    const nextValue =
      `${next.getFullYear()}-${next.getMonth()}`;

    if (
      !this.monthOptions.some(
        option =>
          option.value === nextValue
      )
    ) {
      return;
    }

    this.viewYear =
      next.getFullYear();

    this.viewMonth =
      next.getMonth();

    this.renderCalendar();
  }

  renderCalendar(): void {

    if (!this.bootstrapData) {
      return;
    }

    const cells: CalendarCell[] = [];

    const firstDay =
      new Date(
        this.viewYear,
        this.viewMonth,
        1
      ).getDay();

    const daysInMonth =
      new Date(
        this.viewYear,
        this.viewMonth + 1,
        0
      ).getDate();

    for (
      let index = 0;
      index < firstDay;
      index++
    ) {

      cells.push({
        key: `empty-${index}`,
        empty: true
      });
    }

    const today =
      this.dateStr(new Date());

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {

      const date =
        `${this.viewYear}-${this.pad(
          this.viewMonth + 1
        )}-${this.pad(day)}`;

      const inRange =
        date >= this.bootstrapData.cycle.startDate &&
        date <= this.bootstrapData.cycle.endDate;

      cells.push({

        key: date,

        day,

        inRange,

        selected:
          this.selectedDates.includes(date),

        today:
          date === today,

        full:
          !!this.slotStatus[date]?.full
      });
    }

    this.calendarCells = cells;
  }

  // =========================================================
  // DATE SELECTION
  // =========================================================

  toggleDate(cell: CalendarCell): void {

    if (
      !cell.day ||
      !cell.inRange ||
      cell.full ||
      this.formClosed
    ) {
      return;
    }

    const date = cell.key;

    if (
      this.selectedDates.includes(date)
    ) {

      this.removeDate(date);

      return;
    }

    this.selectedDates = [
      ...this.selectedDates,
      date
    ].sort();

    this.entryByDate[date] = {
      date,
      type: '',
      reason: ''
    };

    this.renderCalendar();
  }

  removeDate(date: string): void {

    this.selectedDates =
      this.selectedDates.filter(
        item => item !== date
      );

    delete this.entryByDate[date];

    this.renderCalendar();
  }

  onTypeChange(date: string): void {

    if (!this.entryByDate[date]) {
      return;
    }

    this.entryByDate[date].reason = '';
  }

  // =========================================================
  // SUBMIT
  // =========================================================

  submit(): void {

    this.clearMessages();

    if (this.formClosed) {

      this.showError(
        'Kỳ đăng ký hiện đã đóng.'
      );

      return;
    }

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
          this.typeNeedsReason(
            entry.type
          ) &&
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
        'Dữ liệu đăng ký chưa tải xong.'
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
            error?.error?.errors;

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
            error?.error?.message ||
            'Không thể kiểm tra đăng ký.'
          );
        }
      });
  }

  // =========================================================
  // FINAL SUBMIT
  // =========================================================

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
            `Đăng ký thành công ${
              response.data.entryCount
            } ngày. Yêu cầu đang chờ Team Lead duyệt.`;

          this.doneEntries = [
            ...this.doneEntries,
            ...response.data.entries
          ];

          const submittedOff =
            entries.some(
              entry =>
                entry.leaveTypeCode === 'OFF'
            );

          if (submittedOff) {
            this.offSubmitDone = true;
          }

          this.selectedDates = [];

          this.entryByDate = {};

          this.pendingEntries = [];

          this.renderCalendar();

          this.loadSlotStatus();
        },

        error: error => {

          this.submitting = false;

          this.confirmOpen = false;

          const validationErrors =
            error?.error?.errors;

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
            error?.error?.message ||
            'Không thể gửi đăng ký.'
          );
        }
      });
  }

  // =========================================================
  // MODAL
  // =========================================================

  closeConfirm(): void {

    if (this.submitting) {
      return;
    }

    this.confirmOpen = false;

    this.pendingEntries = [];
  }
logout(): void {

  this.authService
    .logout()
    .subscribe({
      next: () => {

        console.log(
          'Đăng xuất thành công.'
        );
      },

      error: error => {

        console.error(
          'Logout error:',
          error
        );
      }
    });
}
  // =========================================================
  // SLOT STATUS
  // =========================================================

  private loadSlotStatus(): void {
  if (!this.employee) {
    return;
  }

  this.api
    .getDaySlotStatus(this.employee.task)
    .subscribe({
      next: status => {
        this.slotStatus = status || {};

        this.selectedDates =
          this.selectedDates.filter(
            date => !this.slotStatus[date]?.full
          );

        this.renderCalendar();
      },

      error: error => {
        console.error(
          'Slot status error:',
          error
        );
      }
    });
}

  // =========================================================
  // PAYLOAD
  // =========================================================

  private buildRegistrationPayload():
    RegistrationEntryRequest[] {

    return this.selectedDates.map(
      date => {

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
      }
    );
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
          item.reasonName === selectedReason ||
          String(item.reasonId) ===
            String(selectedReason)
      );

    return reason?.reasonId ?? null;
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private toBoolean(value: unknown): boolean {
    if (value === true || value === 1) {
      return true;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();

      return normalized === 'true' || normalized === '1';
    }

    return false;
  }

  private debugRegistrationBootstrap(
    data: BootstrapData
  ): void {
    const cycle = data.cycle as typeof data.cycle & {
      registrationOpenTime?: string | Date;
      registrationClosingTime?: string | Date;
    };

    const now = new Date();

    const openTime = cycle.registrationOpenTime
  ? new Date(cycle.registrationOpenTime)
  : null;

const closingTime = cycle.registrationClosingTime
  ? new Date(cycle.registrationClosingTime)
  : null;

    const openTimeValid =
      !!openTime && !Number.isNaN(openTime.getTime());

    const closingTimeValid =
      !!closingTime && !Number.isNaN(closingTime.getTime());

    const afterOpen =
      openTimeValid && now >= openTime!;

    const beforeClosing =
      closingTimeValid && now <= closingTime!;

    console.group(
      '[Schedule] Registration bootstrap debug'
    );

    console.log('Cycle:', cycle);

    console.log(
      'Raw isRegistrationOpen:',
      cycle.isRegistrationOpen,
      'type:',
      typeof cycle.isRegistrationOpen
    );

    console.log(
      'Normalized isRegistrationOpen:',
      this.isRegistrationOpen
    );

    console.log('Status:', cycle.status);

    console.log(
      'Browser current time:',
      now.toString(),
      '| ISO:',
      now.toISOString()
    );

    console.log(
      'Registration open time:',
      cycle.registrationOpenTime,
      '| parsed:',
      openTimeValid ? openTime!.toISOString() : 'INVALID/MISSING'
    );

    console.log(
      'Registration closing time:',
      cycle.registrationClosingTime,
      '| parsed:',
      closingTimeValid
        ? closingTime!.toISOString()
        : 'INVALID/MISSING'
    );

    console.log('Client check - after open:', afterOpen);
    console.log(
      'Client check - before closing:',
      beforeClosing
    );

    console.log(
      'Client time window check:',
      afterOpen && beforeClosing
    );

    console.log('formClosed:', this.formClosed);

    if (
      openTimeValid &&
      closingTimeValid &&
      afterOpen &&
      beforeClosing &&
      !this.isRegistrationOpen
    ) {
      console.warn(
        '[Schedule] Backend trả isRegistrationOpen=false ' +
        'trong khi browser đang nằm trong khoảng đăng ký. ' +
        'Hãy kiểm tra runtime/timezone ở backend.'
      );
    }

    console.groupEnd();
  }

  private typeNeedsReason(
    type: string
  ): boolean {

    return !!this.allTypes.find(
      item =>
        item.value === type
    )?.needReason;
  }

  private clearMessages(): void {

    this.errorMessage = '';

    this.successMessage = '';
  }

  private showError(
    message: string
  ): void {

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
        .map(error =>
          error.message ||
          error.code ||
          'Dữ liệu không hợp lệ.'
        )
        .join(' ');
  }

  fmt(date: string): string {

    const [
      year,
      month,
      day
    ] = date.split('-');

    return `${day}/${month}/${year}`;
  }

  private dateStr(date: Date): string {

    return `${date.getFullYear()}-${this.pad(
      date.getMonth() + 1
    )}-${this.pad(
      date.getDate()
    )}`;
  }

  private pad(value: number): string {

    return String(value).padStart(
      2,
      '0'
    );
  }
}