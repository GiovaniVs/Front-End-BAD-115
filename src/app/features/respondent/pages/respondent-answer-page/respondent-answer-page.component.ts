import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { PublicSurvey, PublicSurveyAnswer, PublicSurveyQuestion } from '../../../../core/models/surveys/survey.model';
import { SurveyService } from '../../../../core/services/survey.service';

interface DraftAnswer {
  idOpcion?: number;
  textoRespuesta?: string;
}

@Component({
  selector: 'app-respondent-answer-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './respondent-answer-page.component.html',
  styleUrl: './respondent-answer-page.component.css'
})
export class RespondentAnswerPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly surveyService = inject(SurveyService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private routeSubscription: Subscription | undefined;

  survey: PublicSurvey | undefined;
  token = '';
  readonly answers: Record<number, DraftAnswer> = {};
  isLoading = false;
  isSubmitting = false;
  loadError = '';
  submitError = '';
  submitSuccess = '';

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.token = params.get('token') || '';

      if (!this.token) {
        this.loadError = 'No se encontro el token de acceso de la encuesta.';
        this.changeDetectorRef.detectChanges();
        return;
      }

      this.loadSurvey();
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  loadSurvey(): void {
    this.isLoading = true;
    this.loadError = '';
    this.submitError = '';
    this.submitSuccess = '';
    this.survey = undefined;
    for (const questionId of Object.keys(this.answers)) {
      delete this.answers[Number(questionId)];
    }

    this.surveyService
      .getPublicSurveyByToken(this.token)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.changeDetectorRef.detectChanges();
      }))
      .subscribe({
        next: (survey) => {
          this.survey = survey;
          for (const question of survey.preguntas || []) {
            this.answers[question.idPregunta] = this.answers[question.idPregunta] || {};
          }
          this.changeDetectorRef.detectChanges();
        },
        error: () => {
          this.loadError = 'No se pudo cargar la encuesta. Puede que ya haya sido respondida o no este publicada.';
          this.changeDetectorRef.detectChanges();
        }
      });
  }

  submitAnswers(): void {
    if (!this.survey || this.isSubmitting) {
      return;
    }

    const missingQuestion = this.survey.preguntas.find((question) => !this.isAnswered(question));
    if (missingQuestion) {
      this.submitError = `Responde la pregunta obligatoria: ${missingQuestion.enunciado}`;
      return;
    }

    const respuestas = this.survey.preguntas.map((question) => this.toAnswerPayload(question));
    this.isSubmitting = true;
    this.submitError = '';
    this.submitSuccess = '';

    this.surveyService
      .submitPublicSurveyAnswers(this.token, respuestas)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: (message) => {
          this.submitSuccess = message || 'Encuesta enviada correctamente.';
          window.setTimeout(() => this.router.navigateByUrl('/encuestado/inicio'), 1200);
        },
        error: () => {
          this.submitError = 'No se pudo enviar la encuesta. Revisa tus respuestas e intenta de nuevo.';
        }
      });
  }

  goBack(): void {
    this.router.navigateByUrl('/encuestado/inicio');
  }

  isOptionQuestion(question: PublicSurveyQuestion): boolean {
    return !this.isTextQuestion(question) && (question.opciones?.length || 0) > 0;
  }

  isScaleQuestion(question: PublicSurveyQuestion): boolean {
    return this.normalizeText(question.tipoPregunta) === 'escala';
  }

  isTextQuestion(question: PublicSurveyQuestion): boolean {
    return this.normalizeText(question.tipoPregunta) === 'abierta';
  }

  getScaleValue(optionText: string): string {
    return optionText.trim().split(/\s+/)[0] || optionText;
  }

  getScaleLabel(optionText: string): string {
    return optionText.replace(/^\s*\d+\s*[-.)]?\s*/, '').trim() || optionText;
  }

  private toAnswerPayload(question: PublicSurveyQuestion): PublicSurveyAnswer {
    const answer = this.answers[question.idPregunta] || {};
    return {
      idPregunta: question.idPregunta,
      idOpcion: answer.idOpcion,
      textoRespuesta: answer.textoRespuesta?.trim() || undefined
    };
  }

  private isAnswered(question: PublicSurveyQuestion): boolean {
    if (!question.esObligatoria) {
      return true;
    }

    const answer = this.answers[question.idPregunta];
    if (!answer) {
      return false;
    }

    return this.isOptionQuestion(question)
      ? !!answer.idOpcion
      : !!answer.textoRespuesta?.trim();
  }

  private normalizeText(value: string | undefined): string {
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}
