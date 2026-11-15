import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PublishedScheduleResponse } from '../models/published-schedule.models';

@Injectable({ providedIn: 'root' })
export class PublishedScheduleService {
  private readonly http = inject(HttpClient);

  getPublishedSchedule(): Observable<PublishedScheduleResponse> {
    return this.http.get<PublishedScheduleResponse>(`${environment.apiUrl}/registration/published`);
  }
}
