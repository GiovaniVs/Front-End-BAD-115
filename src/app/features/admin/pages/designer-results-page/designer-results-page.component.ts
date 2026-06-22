import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Survey, SurveySummary } from '../../../../core/models/surveys/survey.model';
import { SurveyService } from '../../../../core/services/survey.service';

@Component({
  selector: 'app-designer-results-page',
  imports: [FormsModule],
  templateUrl: './designer-results-page.component.html',
  styleUrl: './designer-results-page.component.css'
})
export class DesignerResultsPageComponent implements OnInit {
  private readonly surveyService = inject(SurveyService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly surveys: Survey[] = [];
  selectedSurveyId: number | null = null;
  summary: SurveySummary | undefined;
  selectedSurveyTitle = '';
  isLoadingSurveys = false;
  isLoadingSummary = false;
  loadError = '';
  summaryError = '';

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.loadSurveys();
  }

  loadSurveys(): void {
    this.isLoadingSurveys = true;
    this.loadError = '';

    this.surveyService
      .getSurveys()
      .pipe(finalize(() => {
        this.isLoadingSurveys = false;
        this.changeDetectorRef.detectChanges();
      }))
      .subscribe({
        next: (surveys) => {
          const currentUser = this.normalizeText(localStorage.getItem('user_name'));
          const designerSurveys = currentUser
            ? surveys.filter((survey) => this.normalizeText(survey.creadorPor) === currentUser)
            : surveys;

          this.surveys.splice(0, this.surveys.length, ...designerSurveys);

          const firstSurvey = this.surveys[0];
          if (firstSurvey) {
            this.selectedSurveyId = this.getSurveyId(firstSurvey) ?? null;
            this.loadSummary();
          }
        },
        error: () => {
          this.loadError = 'No se pudieron cargar las encuestas del disenador.';
        }
      });
  }

  loadSummary(): void {
    if (!this.selectedSurveyId) {
      this.summary = undefined;
      this.selectedSurveyTitle = '';
      return;
    }

    const selectedSurvey = this.surveys.find((survey) => this.getSurveyId(survey) === this.selectedSurveyId);
    this.selectedSurveyTitle = selectedSurvey?.titulo ?? 'Encuesta seleccionada';
    this.isLoadingSummary = true;
    this.summaryError = '';

    this.surveyService
      .getSurveySummary(this.selectedSurveyId)
      .pipe(finalize(() => {
        this.isLoadingSummary = false;
        this.changeDetectorRef.detectChanges();
      }))
      .subscribe({
        next: (summary) => {
          this.summary = this.normalizeSummary(summary);
        },
        error: () => {
          this.summaryError = 'No se pudo cargar el resumen de resultados.';
        }
      });
  }

  getCompletionPercent(): number {
    return this.clampPercent(this.summary?.tasaRespuesta ?? 0);
  }

  getPendingPercent(): number {
    const summary = this.summary;
    if (!summary || summary.totalAsignados === 0) {
      return 0;
    }

    return this.clampPercent((summary.totalPendientes / summary.totalAsignados) * 100);
  }

  getCompletionCircleStyle(): string {
    const percent = this.getCompletionPercent();
    return `conic-gradient(#2563eb ${percent * 3.6}deg, #e2e8f0 0deg)`;
  }

  formatAverageTime(seconds: number | undefined): string {
    const value = Number(seconds ?? 0);
    if (!Number.isFinite(value) || value <= 0) {
      return '0 s';
    }

    const minutes = Math.floor(value / 60);
    const remainingSeconds = Math.round(value % 60);

    return minutes > 0 ? `${minutes} min ${remainingSeconds} s` : `${remainingSeconds} s`;
  }

  private normalizeSummary(summary: SurveySummary): SurveySummary {
    return {
      totalAsignados: Number(summary.totalAsignados ?? 0),
      totalCompletados: Number(summary.totalCompletados ?? 0),
      totalPendientes: Number(summary.totalPendientes ?? 0),
      tasaRespuesta: Number(summary.tasaRespuesta ?? 0),
      tiempoPromedioSegundos: Number(summary.tiempoPromedioSegundos ?? 0)
    };
  }

  private getSurveyId(survey: Survey): number | undefined {
    return survey.idEncuesta ?? survey.id_encuesta;
  }

  private clampPercent(value: number): number {
    return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  }

  private normalizeText(value: string | null | undefined): string {
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}
