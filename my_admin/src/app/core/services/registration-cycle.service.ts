import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CreateRegistrationCycle, RegistrationCycle } from '../models/registration-cycle.model';

@Injectable({ providedIn: 'root' })
export class RegistrationCycleService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin/registration-cycles`;

  list() { return this.http.get<{ ok: boolean; items: RegistrationCycle[] }>(this.url); }
  create(body: CreateRegistrationCycle) {
    return this.http.post<{ ok: boolean; message: string; data: RegistrationCycle }>(this.url, body);
  }
}
