import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateSurveyRequest } from '../models/surveys/create-survey-request.model';
import { Survey } from '../models/surveys/survey.model';

@Injectable({ providedIn: 'root' })
export class SurveyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/encuestas';

  createSurvey(payload: CreateSurveyRequest): Observable<Survey> {
    return this.http.post<Survey>(this.baseUrl, payload, { headers: this.authHeaders });
  }

  private get authHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }
}
