import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

import { CreateSurveyRequest } from '../models/surveys/create-survey-request.model';
import { PublicSurvey, PublicSurveyAnswer, Survey, SurveyAnalysis, SurveyAssignment, SurveyQuestionDetail, SurveySummary } from '../models/surveys/survey.model';

interface SurveyAssignmentResponseWrapper {
  data?: SurveyAssignment[];
  content?: SurveyAssignment[];
  encuestas?: SurveyAssignment[];
  asignaciones?: SurveyAssignment[];
}

interface LocalSurveyAssignment extends SurveyAssignment {
  localAssignmentId: string;
}

@Injectable({ providedIn: 'root' })
export class SurveyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/encuestas';
  private readonly assignmentsStorageKey = 'survey_assignments';

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

  updateSurveyStatus(idEncuesta: number, estado: 'BORRADOR' | 'PUBLICADA' | 'FINALIZADA' | 'INACTIVA'): Observable<string> {
    const token = this.getStoredToken();

    return this.http.patch(`${this.baseUrl}/${idEncuesta}/${estado}`, null, {
      headers: token ? this.getAuthHeaders(token) : undefined,
      responseType: 'text',
      withCredentials: true
    }).pipe(timeout(15000));
  }

  getSurveySummary(idEncuesta: number): Observable<SurveySummary> {
    const token = this.getStoredToken();

    return this.http.get<SurveySummary>(`${this.baseUrl}/${idEncuesta}/resumen-encuesta`, {
      headers: token ? this.getAuthHeaders(token) : undefined,
      withCredentials: true
    }).pipe(timeout(15000));
  }

  getSurveyAnalysis(idEncuesta: number): Observable<SurveyAnalysis> {
    const token = this.getStoredToken();

    return this.http.get<SurveyAnalysis>(`${this.baseUrl}/${idEncuesta}/analisis`, {
      headers: token ? this.getAuthHeaders(token) : undefined,
      withCredentials: true
    }).pipe(timeout(15000));
  }

  assignSurveyToRespondent(idEncuesta: number, idEncuestado: number, survey: Survey, respondentEmail?: string): Observable<SurveyAssignment> {
    const localAssignment = this.createLocalAssignment(idEncuesta, idEncuestado, survey, respondentEmail);

    return this.assignSurveyToRespondents(idEncuesta, [{ id: idEncuestado, email: respondentEmail }], survey).pipe(
      map((assignments) => assignments[0] ?? localAssignment)
    );
  }

  assignSurveyToRespondents(idEncuesta: number, respondents: { id: number; email?: string }[], survey: Survey): Observable<SurveyAssignment[]> {
    if (respondents.length === 0) {
      return of([]);
    }

    const token = this.getStoredToken();
    const params = new HttpParams().set('idEncuesta', idEncuesta);
    const respondentIds = respondents.map((respondent) => respondent.id);

    return this.http.post(`${this.baseUrl}/asignar`, respondentIds, {
      headers: token ? this.getAuthHeaders(token) : undefined,
      params,
      responseType: 'text',
      withCredentials: true
    }).pipe(
      map(() => respondents.map((respondent) => this.saveLocalAssignment(
        this.createLocalAssignment(idEncuesta, respondent.id, survey, respondent.email)
      ))),
      timeout(15000)
    );
  }

  getAssignedSurveysForRespondent(idEncuestado?: number, correo?: string): Observable<SurveyAssignment[]> {
    const token = this.getStoredToken();

    if (!idEncuestado) {
      return of(this.getLocalAssignments(idEncuestado, correo));
    }

    return this.http.get<SurveyAssignment[] | SurveyAssignmentResponseWrapper>(`/api/encuestados/${idEncuestado}/encuestas-asignadas`, {
      headers: token ? this.getAuthHeaders(token) : undefined,
      withCredentials: true
    }).pipe(
      map((response) => this.mergeAssignments(this.normalizeAssignmentsResponse(response), idEncuestado, correo)),
      timeout(15000),
      catchError(() => this.http.get<SurveyAssignment[] | SurveyAssignmentResponseWrapper>(`/api/encuestados/${idEncuestado}/encuestas-pendientes`, {
        headers: token ? this.getAuthHeaders(token) : undefined,
        withCredentials: true
      }).pipe(
        map((response) => this.mergeAssignments(this.normalizeAssignmentsResponse(response), idEncuestado, correo)),
        catchError(() => of(this.getLocalAssignments(idEncuestado, correo)))
      ))
    );
  }

  getPublicSurveyByToken(tokenAcceso: string): Observable<PublicSurvey> {
    return this.http.get<PublicSurvey>(`/api/encuestas-publicas/${tokenAcceso}`).pipe(timeout(15000));
  }

  submitPublicSurveyAnswers(tokenAcceso: string, respuestas: PublicSurveyAnswer[]): Observable<string> {
    return this.http.post('/api/encuestas-publicas/responder', { tokenAcceso, respuestas }, {
      responseType: 'text'
    }).pipe(timeout(15000));
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

  private normalizeAssignmentsResponse(response: SurveyAssignment[] | SurveyAssignmentResponseWrapper): SurveyAssignment[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.data || response.content || response.encuestas || response.asignaciones || [];
  }

  private mergeAssignments(apiAssignments: SurveyAssignment[], idEncuestado?: number, correo?: string): SurveyAssignment[] {
    const assignmentsBySurvey = new Map<number | string, SurveyAssignment>();

    for (const assignment of [...this.getLocalAssignments(idEncuestado, correo), ...apiAssignments]) {
      assignmentsBySurvey.set(assignment.idEncuesta ?? assignment.id_encuesta ?? assignment.titulo, assignment);
    }

    return Array.from(assignmentsBySurvey.values());
  }

  private createLocalAssignment(idEncuesta: number, idEncuestado: number, survey: Survey, respondentEmail?: string): LocalSurveyAssignment {
    const questions = (survey as Survey & { questions?: SurveyQuestionDetail[] }).questions ?? survey.preguntas;

    return {
      ...survey,
      idEncuesta,
      idEncuestado,
      correoEncuestado: respondentEmail,
      estadoRespuesta: 'PENDIENTE',
      respondida: false,
      preguntas: questions,
      fechaAsignacion: new Date().toISOString(),
      localAssignmentId: `${idEncuesta}-${idEncuestado}`
    };
  }

  private saveLocalAssignment(assignment: LocalSurveyAssignment | SurveyAssignment): SurveyAssignment {
    if (typeof localStorage === 'undefined') {
      return assignment;
    }

    const assignments = this.getAllLocalAssignments();
    const assignmentKey = this.getAssignmentKey(assignment);
    const existingIndex = assignments.findIndex((item) => this.getAssignmentKey(item) === assignmentKey);

    if (existingIndex >= 0) {
      assignments[existingIndex] = { ...assignments[existingIndex], ...assignment };
    } else {
      assignments.push(assignment as LocalSurveyAssignment);
    }

    localStorage.setItem(this.assignmentsStorageKey, JSON.stringify(assignments));
    return assignment;
  }

  private getLocalAssignments(idEncuestado?: number, correo?: string): SurveyAssignment[] {
    const normalizedEmail = this.normalizeText(correo);

    return this.getAllLocalAssignments().filter((assignment) => {
      const assignmentRespondentId = assignment.idEncuestado ?? assignment.id_encuestado;
      const assignmentEmail = this.normalizeText(assignment.correoEncuestado ?? assignment.correo_encuestado);
      const matchesId = idEncuestado ? assignmentRespondentId === idEncuestado : false;
      const matchesEmail = normalizedEmail ? assignmentEmail === normalizedEmail : false;

      return matchesId || matchesEmail;
    });
  }

  private getAllLocalAssignments(): LocalSurveyAssignment[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const value = localStorage.getItem(this.assignmentsStorageKey);
      return value ? JSON.parse(value) as LocalSurveyAssignment[] : [];
    } catch {
      return [];
    }
  }

  private getAssignmentKey(assignment: SurveyAssignment): string {
    const surveyId = assignment.idEncuesta ?? assignment.id_encuesta ?? assignment.titulo;
    const respondentId = assignment.idEncuestado ?? assignment.id_encuestado ?? assignment.correoEncuestado ?? assignment.correo_encuestado ?? '';
    return `${surveyId}-${respondentId}`;
  }

  private normalizeText(value: string | undefined): string {
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}
