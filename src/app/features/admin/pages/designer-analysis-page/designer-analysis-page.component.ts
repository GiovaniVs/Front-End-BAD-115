import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Survey, SurveyAnalysis, SurveyQuestionAnalysis } from '../../../../core/models/surveys/survey.model';
import { SurveyService } from '../../../../core/services/survey.service';

@Component({
  selector: 'app-designer-analysis-page',
  imports: [FormsModule],
  templateUrl: './designer-analysis-page.component.html',
  styleUrl: './designer-analysis-page.component.css'
})
export class DesignerAnalysisPageComponent implements OnInit {
  private readonly surveyService = inject(SurveyService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly surveys: Survey[] = [];
  selectedSurveyId: number | null = null;
  analysis: SurveyAnalysis | undefined;
  isLoadingSurveys = false;
  isLoadingAnalysis = false;
  loadError = '';
  analysisError = '';

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
            this.loadAnalysis();
          }
        },
        error: () => {
          this.loadError = 'No se pudieron cargar las encuestas del disenador.';
        }
      });
  }

  loadAnalysis(): void {
    if (!this.selectedSurveyId) {
      this.analysis = undefined;
      return;
    }

    this.isLoadingAnalysis = true;
    this.analysisError = '';

    this.surveyService
      .getSurveyAnalysis(this.selectedSurveyId)
      .pipe(finalize(() => {
        this.isLoadingAnalysis = false;
        this.changeDetectorRef.detectChanges();
      }))
      .subscribe({
        next: (analysis) => {
          this.analysis = analysis;
        },
        error: () => {
          this.analysisError = 'No se pudo cargar el analisis de respuestas.';
        }
      });
  }

  isOpenQuestion(question: SurveyQuestionAnalysis): boolean {
    return this.normalizeText(question.tipoPregunta) === 'abierta';
  }

  isScaleQuestion(question: SurveyQuestionAnalysis): boolean {
    return this.normalizeText(question.tipoPregunta) === 'escala';
  }

  getQuestionTypeLabel(question: SurveyQuestionAnalysis): string {
    const type = this.normalizeText(question.tipoPregunta);
    if (type === 'abierta') return 'Respuesta abierta';
    if (type === 'escala') return 'Escala Likert';
    if (type === 'ranking') return 'Ranking';
    return 'Seleccion';
  }

  getDominantOption(question: SurveyQuestionAnalysis): string {
    const option = [...question.opciones].sort((first, second) => second.totalRespuestas - first.totalRespuestas)[0];
    return option && option.totalRespuestas > 0 ? option.textoOpcion : 'Sin respuestas';
  }

  getScaleValue(optionText: string): string {
    return optionText.trim().split(/\s+/)[0] || optionText;
  }

  private getSurveyId(survey: Survey): number | undefined {
    return survey.idEncuesta ?? survey.id_encuesta;
  }

  private normalizeText(value: string | null | undefined): string {
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}
