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
  taskId?: number | null;
  taskName?: string | null;

  roles: EmployeeRole[];
}
export interface EmployeeListResponse {
  ok: boolean;
  items: EmployeeItem[];
}

export interface CreateUserRequest {
  employeeCode: string;
  fullName: string;
  email: string;
  password: string;
  teamId: number | null;
  roleIds: number[];
}

export interface CreateUserOptions {
  ok: boolean;
  teams: EmployeeRole[];
  tasks?: EmployeeRole[];
  roles: (EmployeeRole & { code: string })[];
}

export interface CreateUserResponse {
  ok: boolean;
  message: string;
  item: EmployeeItem;
}

export interface UpdateUserRolesResponse {
  ok: boolean;
  message: string;
  employeeId: number;
  roles: EmployeeRole[];
}

export interface UpdateUserTeamResponse {
  ok: boolean;
  message: string;
  employeeId: number;
  teamId: number;
  teamName: string;
}

export interface UpdateUserTaskResponse {
  ok: boolean;
  message: string;
  employeeId: number;
  taskId: number;
  taskName: string;
}
