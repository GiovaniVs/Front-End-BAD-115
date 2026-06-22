import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, timeout } from 'rxjs/operators';

import { CreateSurveyRequest } from '../models/surveys/create-survey-request.model';
import { Survey } from '../models/surveys/survey.model';

@Injectable({ providedIn: 'root' })
export class SurveyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/encuestas';

  createSurvey(payload: CreateSurveyRequest): Observable<Survey> {
    const token = this.getStoredToken();

    return this.http.post(this.baseUrl, payload, {
      headers: token ? this.getAuthHeaders(token) : undefined,
      responseType: 'text',
      withCredentials: true
    }).pipe(
      map((response) => this.normalizeCreateSurveyResponse(response, payload)),
      timeout(15000)
    );
  }

  getSurveys(): Observable<Survey[]> {
    const token = this.getStoredToken();

    return this.http.get<Survey[]>(this.baseUrl, {
      headers: token ? this.getAuthHeaders(token) : undefined,
      withCredentials: true
    }).pipe(timeout(15000));
  }

  getSurveyDetail(idEncuesta: number): Observable<Survey> {
    const token = this.getStoredToken();

    return this.http.get<Survey>(`${this.baseUrl}/${idEncuesta}`, {
      headers: token ? this.getAuthHeaders(token) : undefined,
      withCredentials: true
    }).pipe(timeout(15000));
  }

  updateSurvey(idEncuesta: number, payload: CreateSurveyRequest): Observable<Survey> {
    const token = this.getStoredToken();

    return this.http.put(`${this.baseUrl}/${idEncuesta}`, payload, {
      headers: token ? this.getAuthHeaders(token) : undefined,
      responseType: 'text',
      withCredentials: true
    }).pipe(
      map((response) => this.normalizeCreateSurveyResponse(response, payload)),
      timeout(15000)
    );
  }

  private getStoredToken(): string | undefined {
    if (typeof localStorage === 'undefined') {
      return undefined;
    }

    const token = localStorage.getItem('auth_basic_token') || localStorage.getItem('auth_token');
    return token && token !== 'undefined' ? token : undefined;
  }

  private getAuthHeaders(token: string): HttpHeaders {
    const authorization = token.startsWith('Basic ') || token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    return new HttpHeaders({ Authorization: authorization });
  }

  private normalizeCreateSurveyResponse(response: string, payload: CreateSurveyRequest): Survey {
    if (!response) {
      return this.createFallbackSurvey(payload);
    }

    try {
      return JSON.parse(response) as Survey;
    } catch {
      return {
        ...this.createFallbackSurvey(payload),
        mensaje: response
      };
    }
  }

  private createFallbackSurvey(payload: CreateSurveyRequest): Survey {
    return {
      titulo: payload.titulo,
      objetivo: payload.objetivo,
      instrucciones: payload.instrucciones,
      estado: 'Guardada'
    };
  }
}
