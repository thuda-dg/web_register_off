import {
  Injectable,
  inject
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  EmployeeListResponse,
  CreateUserRequest,
  CreateUserOptions,
  CreateUserResponse,
  UpdateUserRolesResponse
} from '../models/admin.model';

import {
  environment
} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  updateUserRoles(employeeId: number, roleIds: number[]): Observable<UpdateUserRolesResponse> {
    return this.http.patch<UpdateUserRolesResponse>(
      `${environment.apiUrl}/admin/users/${employeeId}/roles`, { roleIds }
    );
  }

  getCreateUserOptions(): Observable<CreateUserOptions> {
    return this.http.get<CreateUserOptions>(`${environment.apiUrl}/admin/users/options`);
  }

  createUser(payload: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(`${environment.apiUrl}/admin/users`, payload);
  }

  private readonly http =
    inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/admin/getall`;

  getAll():
    Observable<EmployeeListResponse> {

    return this.http
      .get<EmployeeListResponse>(
        this.apiUrl
      );
  }

}
