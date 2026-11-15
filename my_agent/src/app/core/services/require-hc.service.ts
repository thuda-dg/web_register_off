import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RequireHcResponse } from '../models/require-hc.models';

@Injectable({ providedIn: 'root' })
export class RequireHcService {
  private readonly http = inject(HttpClient);
  getRequireHc(): Observable<RequireHcResponse> {
    return this.http.get<RequireHcResponse>(`${environment.apiUrl}/registration/require-hc`);
  }
}
