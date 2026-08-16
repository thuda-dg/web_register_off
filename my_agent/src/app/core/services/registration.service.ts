import {
  Injectable,
  inject
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
  RegistrationValidateResponse
} from '../models/registration.model';

import {
  AuthService
} from './auth.service';


@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  private readonly http =
    inject(HttpClient);

  private readonly authService =
    inject(AuthService);


  private readonly apiUrl =
    'http://localhost:3000/api/registration';


  // =========================================================
  // AUTH HEADER
  // =========================================================

  private createHeaders():
    HttpHeaders {

    const token =
      this.authService
        .getAccessToken();


    if (!token) {
      return new HttpHeaders();
    }


    return new HttpHeaders({
      Authorization:
        `Bearer ${token}`
    });
  }


  // =========================================================
  // BOOTSTRAP
  // =========================================================

  getBootstrap(
    cycleId?: number
  ): Observable<BootstrapResponse> {

    const url =
      cycleId
        ? `${this.apiUrl}/bootstrap?cycleId=${cycleId}`
        : `${this.apiUrl}/bootstrap`;


    return this.http
      .get<BootstrapResponse>(
        url,
        {
          headers:
            this.createHeaders()
        }
      );
  }


  // =========================================================
  // VALIDATE
  // =========================================================

  validateRegistration(
    payload:
      RegistrationValidateRequest
  ): Observable<
    RegistrationValidateResponse
  > {

    return this.http
      .post<
        RegistrationValidateResponse
      >(
        `${this.apiUrl}/validate`,
        payload,
        {
          headers:
            this.createHeaders()
        }
      );
  }


  // =========================================================
  // SUBMIT
  // =========================================================

  submitRegistration(
    payload:
      RegistrationSubmitRequest
  ): Observable<
    RegistrationSubmitResponse
  > {

    return this.http
      .post<
        RegistrationSubmitResponse
      >(
        `${this.apiUrl}/submit`,
        payload,
        {
          headers:
            this.createHeaders()
        }
      );
  }
}