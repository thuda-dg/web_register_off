import {
  Injectable
} from '@angular/core';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  BootstrapResponse,
  RegistrationSubmitRequest,
  RegistrationSubmitResponse,
  RegistrationValidateRequest,
  RegistrationValidateResponse,
  MyRegistrationEntriesResponse
} from '../models/registration.model';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  private readonly apiUrl =
    'http://localhost:3000/api/registration';

  constructor(
    private readonly http: HttpClient
  ) {}

  private createHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-Emp-Id': '2'
    });
  }

  getBootstrap(
    cycleId?: number
  ): Observable<BootstrapResponse> {
    const url = cycleId
      ? `${this.apiUrl}/bootstrap?cycleId=${cycleId}`
      : `${this.apiUrl}/bootstrap`;

    return this.http.get<BootstrapResponse>(
      url,
      {
        headers: this.createHeaders()
      }
    );
  }

  validateRegistration(
    payload: RegistrationValidateRequest
  ): Observable<RegistrationValidateResponse> {
    return this.http.post<RegistrationValidateResponse>(
      `${this.apiUrl}/validate`,
      payload,
      {
        headers: this.createHeaders()
      }
    );
  }

  submitRegistration(
    payload: RegistrationSubmitRequest
  ): Observable<RegistrationSubmitResponse> {
    return this.http.post<RegistrationSubmitResponse>(
      `${this.apiUrl}/submit`,
      payload,
      {
        headers: this.createHeaders()
      }
    );
  }

  getMyEntries(
  cycleId: number
): Observable<MyRegistrationEntriesResponse> {
  return this.http.get<MyRegistrationEntriesResponse>(
    `${this.apiUrl}/my-entries?cycleId=${cycleId}`,
    {
      headers: this.createHeaders()
    }
  );
}
}