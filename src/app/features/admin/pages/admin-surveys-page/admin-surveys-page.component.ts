import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  CreateSurveyQuestionRequest,
  SurveyQuestionType
} from '../../../../core/models/surveys/create-survey-request.model';
import { Survey } from '../../../../core/models/surveys/survey.model';
import { AuthService, AuthUserAccount } from '../../../../core/services/auth.service';
import { SurveyService } from '../../../../core/services/survey.service';

interface SurveyQuestion extends CreateSurveyQuestionRequest {
  id: number;
}

interface SurveyDraft extends Survey {
  questions: SurveyQuestion[];
  saved?: boolean;
  questionsLoaded?: boolean;
}

interface RespondentOption {
  id: number;
  label: string;
  email?: string;
}

const QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  CERRADA: 'Seleccion Unica / Multiple',
  ABIERTA: 'Respuesta de Texto Libre',
  ESCALA: 'Escala de Opinion / Likert',
  RANKING: 'Orden de Preferencia'
};

@Component({
  selector: 'app-admin-surveys-page',
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './admin-surveys-page.component.html',
  styleUrl: './admin-surveys-page.component.css'
})
export class AdminSurveysPageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly surveyService = inject(SurveyService);
  private readonly authService = inject(AuthService);
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
  readonly respondents: RespondentOption[] = [];
  selectedSurveyId: number | null = null;
  editingQuestionId: number | null = null;
  showCreateForm = false;
  isSaving = false;
  isSavingSurvey = false;
  isLoadingSurveys = false;
  isLoadingSurveyQuestions = false;
  isLoadingRespondents = false;
  isAssigningSurvey = false;
  isPublishingSurvey = false;
  saveError = '';
  saveSuccess = '';
  listError = '';
  assignmentError = '';
  assignmentSuccess = '';

  readonly surveyForm = this.formBuilder.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    objetivo: [''],
    instrucciones: ['']
  });

  readonly editSurveyForm = this.formBuilder.nonNullable.group({
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

  readonly assignmentForm = this.formBuilder.group({
    idEncuestados: this.formBuilder.nonNullable.control<number[]>([], [Validators.required])
  });

  get selectedSurvey(): SurveyDraft | undefined {
    return this.surveys.find((survey) => this.getSurveyId(survey) === this.selectedSurveyId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.loadSurveys();
    this.loadRespondents();
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

  loadRespondents(): void {
    this.isLoadingRespondents = true;
    this.assignmentError = '';

    this.authService
      .getRespondentsPage(this.getAuthToken(), 0, 100)
      .pipe(
        finalize(() => {
          this.isLoadingRespondents = false;
          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: ({ users }) => {
          this.respondents.splice(0, this.respondents.length, ...users.map((user) => this.toRespondentOption(user)).filter((user): user is RespondentOption => !!user));
        },
        error: () => {
          this.assignmentError = 'No se pudo cargar la lista de encuestados.';
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
      saved: false,
      questionsLoaded: true
    });
    this.selectedSurveyId = idEncuesta;
    this.surveyForm.reset();
    this.showCreateForm = false;
    this.isSaving = false;
  }

  selectSurveyForQuestions(survey: SurveyDraft): void {
    this.selectedSurveyId = this.getSurveyId(survey) ?? null;
    this.editingQuestionId = null;
    this.patchEditSurveyForm(survey);
    this.questionForm.reset({
      enunciado: '',
      tipoPregunta: 'CERRADA',
      esObligatoria: true,
      opciones: ''
    });
    this.saveError = '';
    this.saveSuccess = '';

    const surveyId = this.getSurveyId(survey);
    if (!surveyId || survey.questionsLoaded) {
      return;
    }

    this.isLoadingSurveyQuestions = true;
    this.surveyService
      .getSurveyDetail(surveyId)
      .pipe(
        finalize(() => {
          this.isLoadingSurveyQuestions = false;
          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: (detail) => {
          survey.titulo = detail.titulo ?? survey.titulo;
          survey.objetivo = detail.objetivo ?? detail.objective ?? survey.objetivo;
          survey.instrucciones = detail.instrucciones ?? survey.instrucciones;
          survey.estado = detail.estado ?? survey.estado;
          survey.questions = this.mapDetailQuestions(detail);
          survey.questionsLoaded = true;
          this.patchEditSurveyForm(survey);
          this.changeDetectorRef.detectChanges();
        },
        error: () => {
          this.saveError = 'No se pudieron cargar las preguntas de la encuesta.';
          this.changeDetectorRef.detectChanges();
        }
      });
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

    const questionId = this.editingQuestionId ?? Date.now();
    const question: SurveyQuestion = {
      id: questionId,
      enunciado,
      tipoPregunta,
      orden: this.editingQuestionId ? survey.questions.find((item) => item.id === this.editingQuestionId)?.orden ?? survey.questions.length + 1 : survey.questions.length + 1,
      esObligatoria,
      opciones: parsedOptions.map((option) => ({
        textoOpcion: option,
        esMixta: this.isMixedOption(option)
      }))
    };

    if (this.editingQuestionId) {
      const questionIndex = survey.questions.findIndex((item) => item.id === this.editingQuestionId);
      if (questionIndex >= 0) {
        survey.questions[questionIndex] = question;
      }
    } else {
      survey.questions.push(question);
    }

    survey.saved = false;
    survey.estado = 'Borrador';
    this.editingQuestionId = null;

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

  applySurveyDetails(): void {
    const survey = this.selectedSurvey;
    if (!survey) {
      return;
    }

    if (this.editSurveyForm.invalid) {
      this.editSurveyForm.markAllAsTouched();
      return;
    }

    const { titulo, objetivo, instrucciones } = this.editSurveyForm.getRawValue();
    survey.titulo = titulo;
    survey.objetivo = objetivo || undefined;
    survey.instrucciones = instrucciones || undefined;
    survey.saved = false;
    this.saveSuccess = '';
  }

  markSelectedSurveyUnsaved(): void {
    const survey = this.selectedSurvey;
    if (!survey) {
      return;
    }

    survey.saved = false;
    this.saveSuccess = '';
  }

  editQuestion(question: SurveyQuestion): void {
    this.editingQuestionId = question.id;
    this.questionForm.reset({
      enunciado: question.enunciado,
      tipoPregunta: question.tipoPregunta,
      esObligatoria: question.esObligatoria,
      opciones: question.opciones.map((option) => option.textoOpcion).join('\n')
    });
    this.saveError = '';
    this.saveSuccess = '';
  }

  cancelQuestionEdit(): void {
    this.editingQuestionId = null;
    this.questionForm.reset({
      enunciado: '',
      tipoPregunta: 'CERRADA',
      esObligatoria: true,
      opciones: ''
    });
  }

  saveSelectedSurvey(): void {
    const survey = this.selectedSurvey;
    if (!survey || this.isSavingSurvey) {
      return;
    }

    if (!this.applySurveyDetailsBeforeSave(survey)) {
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
      this.saveError = 'El backend no respondio al guardar. Revisa la consola de Spring Boot y la peticion de encuestas en Network.';
      this.changeDetectorRef.detectChanges();
    }, 10000);

    const surveyId = this.getPersistedSurveyId(survey);
    const payload = {
      titulo: survey.titulo,
      objetivo: survey.objetivo,
      instrucciones: survey.instrucciones,
      preguntas: survey.questions.map(({ id: _id, ...question }) => question)
    };

    const request = surveyId
      ? this.surveyService.updateSurvey(surveyId, payload)
      : this.surveyService.createSurvey(payload);

    request
      .pipe(
        finalize(() => {
          this.clearSaveRequestTimeout();
          this.finishSavingSurvey();
        })
      )
      .subscribe({
        next: (createdSurvey) => {
          survey.idEncuesta = createdSurvey.idEncuesta ?? createdSurvey.id_encuesta ?? survey.idEncuesta;
          survey.estado = createdSurvey.estado ?? survey.estado ?? 'Guardada';
          survey.fechaCreacion = createdSurvey.fechaCreacion ?? createdSurvey.fecha_creacion ?? survey.fechaCreacion;
          survey.saved = true;
          this.saveSuccess = createdSurvey.mensaje ?? (surveyId ? 'Encuesta actualizada correctamente.' : 'Encuesta guardada correctamente.');
          this.changeDetectorRef.detectChanges();
        },
        error: (error: unknown) => {
          this.saveError = this.getSaveErrorMessage(error);
          this.changeDetectorRef.detectChanges();
        }
      });
  }

  assignSelectedSurvey(): void {
    const survey = this.selectedSurvey;
    const surveyId = survey ? this.getPersistedSurveyId(survey) : undefined;

    if (!survey || !surveyId) {
      this.assignmentError = 'Guarda la encuesta antes de asignarla a un encuestado.';
      return;
    }

    if (this.assignmentForm.invalid) {
      this.assignmentForm.markAllAsTouched();
      return;
    }

    const selectedIds = this.assignmentForm.controls.idEncuestados.value;
    const selectedRespondents = this.respondents.filter((item) => selectedIds.includes(item.id));

    if (selectedRespondents.length === 0) {
      this.assignmentError = 'Selecciona al menos un encuestado valido.';
      return;
    }

    this.isAssigningSurvey = true;
    this.assignmentError = '';
    this.assignmentSuccess = '';

    this.surveyService
      .assignSurveyToRespondents(surveyId, selectedRespondents, survey)
      .pipe(
        finalize(() => {
          this.isAssigningSurvey = false;
          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.assignmentSuccess = selectedRespondents.length === 1
            ? `Encuesta asignada a ${selectedRespondents[0].label}.`
            : `Encuesta asignada a ${selectedRespondents.length} encuestados.`;
          this.assignmentForm.reset({ idEncuestados: [] });
        },
        error: () => {
          this.assignmentError = 'No se pudo asignar la encuesta.';
        }
      });
  }

  publishSelectedSurvey(): void {
    const survey = this.selectedSurvey;
    const surveyId = survey ? this.getPersistedSurveyId(survey) : undefined;

    if (!survey || !surveyId) {
      this.saveError = 'Guarda la encuesta antes de publicarla.';
      return;
    }

    if (!survey.saved) {
      this.saveError = 'Guarda los cambios pendientes antes de publicar la encuesta.';
      return;
    }

    if (survey.questions.length === 0) {
      this.saveError = 'Agrega al menos una pregunta antes de publicar la encuesta.';
      return;
    }

    this.isPublishingSurvey = true;
    this.saveError = '';
    this.saveSuccess = '';

    this.surveyService
      .updateSurveyStatus(surveyId, 'PUBLICADA')
      .pipe(
        finalize(() => {
          this.isPublishingSurvey = false;
          this.changeDetectorRef.detectChanges();
        })
      )
      .subscribe({
        next: (message) => {
          survey.estado = 'P';
          this.saveSuccess = message || 'Encuesta publicada correctamente.';
        },
        error: (error: unknown) => {
          this.saveError = this.getStatusErrorMessage(error);
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

  private getStatusErrorMessage(error: unknown): string {
    if (this.isTimeoutError(error)) {
      return 'El backend no respondio a tiempo al publicar. Verifica que Spring Boot este ejecutandose en el puerto 8083.';
    }

    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo publicar la encuesta. Revisa la conexion con el API.';
    }

    const backendMessage = typeof error.error === 'string' ? error.error : undefined;

    if (error.status === 0) {
      return 'No se pudo publicar la encuesta. Si usas el backend directo, reinicia Spring Boot para aplicar CORS con PATCH.';
    }

    if (error.status === 401 || error.status === 403) {
      return 'No tienes permisos para publicar la encuesta. Cierra sesion e inicia nuevamente como disenador.';
    }

    return backendMessage || `No se pudo publicar la encuesta. Error ${error.status}.`;
  }

  private isTimeoutError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'name' in error && error.name === 'TimeoutError';
  }

  private hasAuthToken(): boolean {
    const token = this.getAuthToken();
    return !!token && token !== 'undefined';
  }

  private getAuthToken(): string | undefined {
    const token = this.getLocalStorageValue('auth_token') || this.getLocalStorageValue('auth_basic_token');
    return token && token !== 'undefined' ? token : undefined;
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
      saved: true,
      questionsLoaded: false
    };
  }

  private patchEditSurveyForm(survey: Survey): void {
    this.editSurveyForm.reset({
      titulo: survey.titulo,
      objetivo: survey.objetivo ?? survey.objective ?? '',
      instrucciones: survey.instrucciones ?? ''
    });
  }

  private applySurveyDetailsBeforeSave(survey: SurveyDraft): boolean {
    if (this.editSurveyForm.invalid) {
      this.editSurveyForm.markAllAsTouched();
      this.saveError = 'Revisa el titulo de la encuesta antes de guardar.';
      return false;
    }

    const { titulo, objetivo, instrucciones } = this.editSurveyForm.getRawValue();
    survey.titulo = titulo;
    survey.objetivo = objetivo || undefined;
    survey.instrucciones = instrucciones || undefined;
    return true;
  }

  private mapDetailQuestions(survey: Survey): SurveyQuestion[] {
    return (survey.preguntas || [])
      .map((question) => ({
        id: question.idPregunta ?? question.orden ?? Date.now(),
        enunciado: question.enunciado,
        esObligatoria: question.esObligatoria,
        orden: question.orden,
        tipoPregunta: this.toQuestionType(question.tipoPregunta),
        opciones: (question.opciones || []).map((option) => ({
          textoOpcion: option.textoOpcion,
          esMixta: option.esMixta
        }))
      }))
      .sort((first, second) => first.orden - second.orden);
  }

  private toQuestionType(type: string): SurveyQuestionType {
    const normalizedType = type?.toUpperCase() as SurveyQuestionType;
    return this.questionTypes.some((questionType) => questionType.value === normalizedType) ? normalizedType : 'CERRADA';
  }

  private getSurveyId(survey: Survey): number | undefined {
    return survey.idEncuesta ?? survey.id_encuesta;
  }

  getSurveyStatusLabel(survey: Survey): string {
    const status = this.normalizeText(survey.estado);

    if (status === 'p' || status === 'publicada') {
      return 'Publicada';
    }

    if (status === 'f' || status === 'finalizada') {
      return 'Finalizada';
    }

    if (status === 'i' || status === 'inactiva') {
      return 'Inactiva';
    }

    return 'Borrador';
  }

  isSurveyPublished(survey: Survey): boolean {
    const status = this.normalizeText(survey.estado);
    return status === 'p' || status === 'publicada';
  }

  private toRespondentOption(user: AuthUserAccount): RespondentOption | undefined {
    const id = user.idEncuestado ?? user.id_encuestado ?? user.idUsuario ?? user.id_usuario;
    if (!id) {
      return undefined;
    }

    const email = user.correoElectronico ?? user.correo_electronico ?? user.correo ?? user.username;
    const fullName = [user.nombres, user.apellidos].filter(Boolean).join(' ').trim();

    return {
      id,
      label: fullName || email || `Encuestado ${id}`,
      email
    };
  }

  private getPersistedSurveyId(survey: SurveyDraft): number | undefined {
    const surveyId = this.getSurveyId(survey);
    return survey.saved || survey.questionsLoaded === false || survey.creadorPor ? surveyId : undefined;
  }

  private normalizeText(value: string | undefined | null): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
