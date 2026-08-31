export interface RegistrationEntryRequest {
  leaveDate: string;
  leaveTypeCode: string;
  reasonId?: number | null;
  customReason?: string | null;
}

export interface RegistrationValidateRequest {
  cycleId: number;
  entries: RegistrationEntryRequest[];
}

export interface RegistrationSubmitRequest {
  cycleId: number;
  entries: RegistrationEntryRequest[];
}

export interface RegistrationError {
  code: string;
  message: string;
  leaveDate?: string;
  leaveTypeCode?: string;
  entryIndex?: number;
  entryIndexes?: number[];
}

export interface RegistrationValidateResponse {
  ok: boolean;
  valid: boolean;
  errors: RegistrationError[];
}

export interface RegistrationSubmitEntry {
  entryId: number;
  registrationCode: string;
  leaveDate: string;
  leaveTypeId: number;
  reasonId: number | null;
  customReason: string | null;
  teamId: number;
  taskId: number;
  leaveUnits: number;
  currentStatus: string;
}

export interface RegistrationSubmitData {
  submissionCode: string;
  submissionId: number;
  entryCount: number;
  entries: RegistrationSubmitEntry[];
}

export interface RegistrationSubmitResponse {
  ok: boolean;
  message: string;
  data: RegistrationSubmitData;
}

export interface LeaveReason {
  reasonId: number;
  reasonName: string;
}

export interface LeaveType {
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  needReason: boolean;
  deductionSource: string | null;
  deductionQuantity: number;
  reasons: LeaveReason[];
}

export interface LeaveBalance {
  entitled: number;
  adjusted: number;
  used: number;
  remaining: number;
}

export interface BootstrapData {
  employee: {
    empId: number;
    empCode: string;
    empName: string;
    empEmail: string;
  };

  team: {
    teamId: number;
    teamCode: string;
    teamName: string;
  };

  task: {
    taskId: number;
    taskCode: string;
    taskName: string;
  };

  cycle: {
    cycleId: number;
    cycleCode: string;
    cycleName: string;
    startDate: string;
    endDate: string;
    registrationOpenTime: string;
    registrationClosingTime: string;
    status: string;
    isRegistrationOpen: boolean;
    nextOpenDate: string | null;
  };

  leaveTypes: LeaveType[];

  balances: {
    annualLeave: LeaveBalance & {
      year: number;
    };

    off: LeaveBalance & {
      cycleId: number;
    };
  };

  requireHC: Array<{
  requireHCId: number;
  workingDate: string;
  maxOff: number;
  currentOff: number;
  remaining: number;
  full: boolean;
}>;
}

export interface BootstrapResponse {
  ok: boolean;
  message: string;
  data: BootstrapData;
}

export interface MyRegistrationEntry {
  submissionId: number;
  submissionCode: string;
  submittedAt: string;

  entryId: number;
  registrationCode: string;
  leaveDate: string;

  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  leaveUnits: number;

  reasonId: number | null;
  customReason: string | null;

  teamId: number;
  taskId: number;

  currentStatus: string;
}

export interface MyRegistrationEntriesData {
  hasOff: boolean;
  entries: MyRegistrationEntry[];
}

export interface MyRegistrationEntriesResponse {
  ok: boolean;
  message: string;
  data: MyRegistrationEntriesData;
}