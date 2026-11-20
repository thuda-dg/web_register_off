import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PublishedScheduleResponse, PublishOffResponse } from '../models/published-schedule.models';

@Injectable({ providedIn: 'root' })
export class PublishedScheduleService {
  private readonly http = inject(HttpClient);

  getPublishedSchedule(): Observable<PublishedScheduleResponse> {
    return this.http.get<PublishedScheduleResponse>(`${environment.apiUrl}/registration/published`);
  }

  getMyPublishedSchedule(): Observable<PublishedScheduleResponse> {
    return this.http.get<PublishedScheduleResponse>(`${environment.apiUrl}/registration/published?mine=true`);
  }

  publish(cycleId: number, entryIds: number[]): Observable<PublishOffResponse> {
    return this.http.post<PublishOffResponse>(`${environment.apiUrl}/registration/published`, { cycleId, entryIds });
  }
}
