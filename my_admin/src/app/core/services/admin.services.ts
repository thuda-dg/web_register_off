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
  EmployeeListResponse
} from '../models/admin.model';

import {
  environment
} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

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