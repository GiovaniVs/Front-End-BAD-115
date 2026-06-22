import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  CreateSurveyQuestionRequest,
  SurveyQuestionType
} from '../../../../core/models/surveys/create-survey-request.model';
import { Survey } from '../../../../core/models/surveys/survey.model';
import { SurveyService } from '../../../../core/services/survey.service';

interface SurveyQuestion extends CreateSurveyQuestionRequest {
  id: number;
}

interface SurveyDraft extends Survey {
  questions: SurveyQuestion[];
  saved?: boolean;
}

const QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  CERRADA: 'Seleccion Unica / Multiple',
  ABIERTA: 'Respuesta de Texto Libre',
  ESCALA: 'Escala de Opinion / Likert',
  RANKING: 'Orden de Preferencia'
};

@Component({
  selector: 'app-admin-surveys-page',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-surveys-page.component.html',
  styleUrl: './admin-surveys-page.component.css'
})
export class AdminSurveysPageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly surveyService = inject(SurveyService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private saveRequestTimeoutId: number | undefined;

  readonly questionTypes: { value: SurveyQuestionType; label: string }[] = [
    { value: 'CERRADA', label: QUESTION_TYPE_LABELS.CERRADA },
    { value: 'ABIERTA', label: QUESTION_TYPE_LABELS.ABIERTA },
    { value: 'ESCALA', label: QUESTION_TYPE_LABELS.ESCALA },
    { value: 'RANKING', label: QUESTION_TYPE_LABELS.RANKING }
  ];
  readonly surveys: SurveyDraft[] = [];
  selectedSurveyId: number | null = null;
  showCreateForm = false;
  isSaving = false;
  isSavingSurvey = false;
  isLoadingSurveys = false;
  saveError = '';
  saveSuccess = '';
  listError = '';

  readonly surveyForm = this.formBuilder.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    objetivo: [''],
    instrucciones: ['']
  });

  readonly questionForm = this.formBuilder.nonNullable.group({
    enunciado: ['', [Validators.required, Validators.minLength(5)]],
    tipoPregunta: this.formBuilder.nonNullable.control<SurveyQuestionType>('CERRADA', [Validators.required]),
    esObligatoria: true,
    opciones: ['']
  });

  get selectedSurvey(): SurveyDraft | undefined {
    return this.surveys.find((survey) => survey.idEncuesta === this.selectedSurveyId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.loadSurveys();
  }

  loadSurveys(): void {
    this.isLoadingSurveys = true;
    this.listError = '';

    this.surveyService
      .getSurveys()
      .pipe(
        finalize(() => {
          this.isLoadingSurveys = false;
          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: (surveys) => {
          const currentUser = this.normalizeText(this.getLocalStorageValue('user_name'));
          const designerSurveys = currentUser
            ? surveys.filter((survey) => this.normalizeText(survey.creadorPor) === currentUser)
            : [];

          this.surveys.splice(0, this.surveys.length, ...designerSurveys.map((survey) => this.toSurveyDraft(survey)));
        },
        error: () => {
          this.listError = 'No se pudieron cargar las encuestas del disenador.';
        }
      });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    this.saveError = '';
    this.saveSuccess = '';
  }

  createSurvey(): void {
    if (this.surveyForm.invalid) {
      this.surveyForm.markAllAsTouched();
      return;
    }

    const { titulo, objetivo, instrucciones } = this.surveyForm.getRawValue();
    this.isSaving = true;
    this.saveError = '';

    const idEncuesta = Date.now();
    this.surveys.unshift({
      idEncuesta,
      titulo,
      objetivo: objetivo || undefined,
      instrucciones: instrucciones || undefined,
      estado: 'Borrador',
      fechaCreacion: new Date().toLocaleDateString(),
      questions: [],
      saved: false
    });
    this.selectedSurveyId = idEncuesta;
    this.surveyForm.reset();
    this.showCreateForm = false;
    this.isSaving = false;
  }

  selectSurveyForQuestions(survey: SurveyDraft): void {
    this.selectedSurveyId = survey.idEncuesta ?? null;
    this.questionForm.reset({
      enunciado: '',
      tipoPregunta: 'CERRADA',
      esObligatoria: true,
      opciones: ''
    });
    this.saveError = '';
    this.saveSuccess = '';
  }

  addQuestion(): void {
    const survey = this.selectedSurvey;
    if (!survey) {
      return;
    }

    if (this.questionForm.invalid) {
      this.questionForm.markAllAsTouched();
      return;
    }

    const { enunciado, tipoPregunta, esObligatoria, opciones } = this.questionForm.getRawValue();
    const parsedOptions = this.shouldQuestionUseOptions(tipoPregunta) ? this.parseOptions(opciones) : [];

    if (this.shouldQuestionUseOptions(tipoPregunta) && parsedOptions.length === 0) {
      this.questionForm.controls.opciones.setErrors({ required: true });
      this.questionForm.controls.opciones.markAsTouched();
      return;
    }

    survey.questions.push({
      id: Date.now(),
      enunciado,
      tipoPregunta,
      orden: survey.questions.length + 1,
      esObligatoria,
      opciones: parsedOptions.map((option) => ({
        textoOpcion: option,
        esMixta: this.isMixedOption(option)
      }))
    });
    survey.saved = false;
    survey.estado = 'Borrador';

    this.questionForm.reset({
      enunciado: '',
      tipoPregunta: 'CERRADA',
      esObligatoria: true,
      opciones: ''
    });
    this.saveError = '';
    this.saveSuccess = '';
  }

  shouldShowOptions(): boolean {
    return this.shouldQuestionUseOptions(this.questionForm.controls.tipoPregunta.value);
  }

  optionPreview(): string[] {
    return this.parseOptions(this.questionForm.controls.opciones.value);
  }

  onQuestionTypeChange(): void {
    this.questionForm.controls.opciones.setErrors(null);
    if (!this.shouldShowOptions()) {
      this.questionForm.controls.opciones.setValue('');
    }
  }

  questionTypeLabel(type: SurveyQuestionType): string {
    return QUESTION_TYPE_LABELS[type];
  }

  saveSelectedSurvey(): void {
    const survey = this.selectedSurvey;
    if (!survey || this.isSavingSurvey) {
      return;
    }

    if (survey.questions.length === 0) {
      this.saveError = 'Agrega al menos una pregunta antes de guardar la encuesta.';
      return;
    }

    if (!this.hasAuthToken()) {
      this.saveError = 'No hay credenciales de sesion para guardar. Cierra sesion e inicia de nuevo como disenador.';
      return;
    }

    this.isSavingSurvey = true;
    this.saveError = '';
    this.saveSuccess = '';
    this.clearSaveRequestTimeout();
    this.saveRequestTimeoutId = window.setTimeout(() => {
      if (!this.isSavingSurvey) {
        return;
      }

      this.finishSavingSurvey();
      this.saveError = 'El backend no respondio al guardar. Revisa la consola de Spring Boot y la peticion POST /api/encuestas en Network.';
      this.changeDetectorRef.detectChanges();
    }, 10000);

    this.surveyService
      .createSurvey({
        titulo: survey.titulo,
        objetivo: survey.objetivo,
        instrucciones: survey.instrucciones,
        preguntas: survey.questions.map(({ id: _id, ...question }) => question)
      })
      .pipe(
        finalize(() => {
          this.clearSaveRequestTimeout();
          this.finishSavingSurvey();
        })
      )
      .subscribe({
        next: (createdSurvey) => {
          survey.idEncuesta = createdSurvey.idEncuesta ?? createdSurvey.id_encuesta ?? survey.idEncuesta;
          survey.estado = createdSurvey.estado ?? 'Guardada';
          survey.fechaCreacion = createdSurvey.fechaCreacion ?? createdSurvey.fecha_creacion ?? survey.fechaCreacion;
          survey.saved = true;
          this.saveSuccess = createdSurvey.mensaje ?? 'Encuesta guardada correctamente.';
          this.changeDetectorRef.detectChanges();
        },
        error: (error: unknown) => {
          this.saveError = this.getSaveErrorMessage(error);
          this.changeDetectorRef.detectChanges();
        }
      });
  }

  private finishSavingSurvey(): void {
    this.isSavingSurvey = false;
    this.changeDetectorRef.detectChanges();
  }

  private clearSaveRequestTimeout(): void {
    if (this.saveRequestTimeoutId === undefined) {
      return;
    }

    window.clearTimeout(this.saveRequestTimeoutId);
    this.saveRequestTimeoutId = undefined;
  }

  private parseOptions(options: string): string[] {
    return options
      .split('\n')
      .map((option) => option.trim())
      .filter(Boolean);
  }

  private shouldQuestionUseOptions(type: SurveyQuestionType): boolean {
    return type !== 'ABIERTA';
  }

  private isMixedOption(option: string): boolean {
    const normalizedOption = option.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return normalizedOption.includes('otro') || normalizedOption.includes('especifique');
  }

  private getSaveErrorMessage(error: unknown): string {
    if (this.isTimeoutError(error)) {
      return 'El backend no respondio a tiempo. Verifica que Spring Boot este ejecutandose en el puerto 8083.';
    }

    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo guardar la encuesta. Revisa la conexion con el API.';
    }

    if (error.status === 0) {
      return 'El backend no respondio a tiempo. Verifica que Spring Boot este ejecutandose en el puerto 8083.';
    }

    if (error.status === 401 || error.status === 403) {
      return 'No se pudo autenticar la sesion. Cierra sesion e inicia de nuevo; si fallaste varias veces, verifica que el usuario no este bloqueado.';
    }

    if (error.status === 400) {
      return 'El backend rechazo los datos de la encuesta. Revisa que cada pregunta tenga el tipo y opciones correctas.';
    }

    return `No se pudo guardar la encuesta. Error ${error.status}.`;
  }

  private isTimeoutError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'name' in error && error.name === 'TimeoutError';
  }

  private hasAuthToken(): boolean {
    const token = this.getLocalStorageValue('auth_token') || this.getLocalStorageValue('auth_basic_token');
    return !!token && token !== 'undefined';
  }

  private getLocalStorageValue(key: string): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(key);
  }

  private toSurveyDraft(survey: Survey): SurveyDraft {
    return {
      ...survey,
      objetivo: survey.objetivo ?? survey.objective,
      questions: [],
      saved: true
    };
  }

  private normalizeText(value: string | undefined | null): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
