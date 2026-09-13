export interface EmployeeRole {
  id: number;
  name: string;
}

export interface EmployeeItem {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;

  teamId: number | null;
  teamName: string | null;

  roles: EmployeeRole[];
}
export interface EmployeeListResponse {
  ok: boolean;
  items: EmployeeItem[];
}