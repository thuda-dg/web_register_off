export interface RegistrationCycle {
  id: number;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  registrationOpenTime: string;
  registrationClosingTime: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED';
}

export interface CreateRegistrationCycle {
  startDate: string;
  endDate: string;
}
