import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { SurveyAssignment } from '../../../../core/models/surveys/survey.model';
import { SurveyService } from '../../../../core/services/survey.service';

interface AssignedSurvey {
  id: number | string;
  title: string;
  description: string;
  status: 'Pendiente' | 'Completada';
  questions: number;
  dateText: string;
  token?: string;
}

@Component({
  selector: 'app-respondent-home-page',
  imports: [RouterLink],
  templateUrl: './respondent-home-page.component.html',
  styleUrl: './respondent-home-page.component.css'
})
export class RespondentHomePageComponent implements OnInit {
  private readonly surveyService = inject(SurveyService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly surveys: AssignedSurvey[] = [];
  isLoading = false;
  loadError = '';

  get completedSurveys(): AssignedSurvey[] {
    return this.surveys.filter((survey) => survey.status === 'Completada');
  }

  get pendingSurveys(): AssignedSurvey[] {
    return this.surveys.filter((survey) => survey.status === 'Pendiente');
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.loadAssignedSurveys();
  }

  loadAssignedSurveys(): void {
    this.isLoading = true;
    this.loadError = '';

    const respondent = this.getRespondentIdentity();

    this.surveyService
      .getAssignedSurveysForRespondent(respondent.id, respondent.email)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: (surveys) => {
          this.surveys.splice(0, this.surveys.length, ...surveys.map((survey) => this.toAssignedSurvey(survey)));
        },
        error: () => {
          this.loadError = 'No se pudieron cargar tus encuestas asignadas.';
        }
      });
  }

  private toAssignedSurvey(survey: SurveyAssignment): AssignedSurvey {
    const isCompleted = this.isCompletedSurvey(survey);

    return {
      id: survey.idAsignacion ?? survey.id_asignacion ?? survey.idEncuesta ?? survey.id_encuesta ?? survey.titulo,
      title: survey.titulo,
      description: survey.objetivo ?? survey.objective ?? survey.instrucciones ?? 'Encuesta asignada para responder.',
      status: isCompleted ? 'Completada' : 'Pendiente',
      questions: survey.preguntas?.length ?? 0,
      token: survey.tokenAcceso ?? survey.token_acceso,
      dateText: isCompleted
        ? `Respondida ${this.formatDate(survey.fechaRespuesta ?? survey.fecha_respuesta)}`
        : `Asignada ${this.formatDate(survey.fechaAsignacion ?? survey.fecha_asignacion)}`
    };
  }

  private isCompletedSurvey(survey: SurveyAssignment): boolean {
    const status = this.normalizeText(survey.estadoRespuesta ?? survey.estado_respuesta ?? survey.estado);
    return survey.respondida === true || survey.completada === true || status === 'respondida' || status === 'completada' || status === 'completado';
  }

  private getRespondentIdentity(): { id?: number; email?: string } {
    const email = localStorage.getItem('respondent_email') || undefined;

    try {
      const respondentData = localStorage.getItem('respondent_data');
      const respondent = respondentData ? JSON.parse(respondentData) as Record<string, unknown> : {};
      const id = this.toNumber(respondent['idEncuestado'] ?? respondent['id_encuestado'] ?? respondent['idUsuario'] ?? respondent['id_usuario']);

      return { id, email };
    } catch {
      return { email };
    }
  }

  private toNumber(value: unknown): number | undefined {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : undefined;
  }

  private formatDate(value: string | undefined): string {
    if (!value) {
      return 'recientemente';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }

  private normalizeText(value: string | undefined): string {
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}
