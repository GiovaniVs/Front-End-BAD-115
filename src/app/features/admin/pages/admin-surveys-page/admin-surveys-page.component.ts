import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Survey } from '../../../../core/models/surveys/survey.model';

type QuestionType = 'Cerrada' | 'Verdadero/Falso' | 'Ranking';

interface SurveyQuestion {
  id: number;
  enunciado: string;
  tipo: QuestionType;
  esObligatoria: boolean;
  opciones: string[];
  opcionesCorrectas: string[];
}

interface SurveyDraft extends Survey {
  questions: SurveyQuestion[];
}

@Component({
  selector: 'app-admin-surveys-page',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-surveys-page.component.html',
  styleUrl: './admin-surveys-page.component.css'
})
export class AdminSurveysPageComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly surveys: SurveyDraft[] = [];
  selectedSurveyId: number | null = null;
  showCreateForm = false;
  isSaving = false;
  saveError = '';
  selectedCorrectOptions: string[] = [];

  readonly surveyForm = this.formBuilder.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    objetivo: [''],
    instrucciones: ['']
  });

  readonly questionForm = this.formBuilder.nonNullable.group({
    enunciado: ['', [Validators.required, Validators.minLength(5)]],
    tipo: this.formBuilder.nonNullable.control<QuestionType>('Cerrada', [Validators.required]),
    esObligatoria: true,
    opciones: [''],
    opcionCorrecta: ['']
  });

  get selectedSurvey(): SurveyDraft | undefined {
    return this.surveys.find((survey) => survey.idEncuesta === this.selectedSurveyId);
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    this.saveError = '';
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
      questions: []
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
      tipo: 'Cerrada',
      esObligatoria: true,
      opciones: '',
      opcionCorrecta: ''
    });
    this.selectedCorrectOptions = [];
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

    const { enunciado, tipo, esObligatoria, opciones, opcionCorrecta } = this.questionForm.getRawValue();
    const parsedOptions = tipo === 'Verdadero/Falso' ? ['Verdadero', 'Falso'] : this.parseOptions(opciones);
    const opcionesCorrectas = tipo === 'Cerrada' ? this.selectedCorrectOptions : opcionCorrecta ? [opcionCorrecta] : [];

    if (tipo !== 'Ranking' && opcionesCorrectas.length === 0) {
      this.questionForm.controls.opcionCorrecta.setErrors({ required: true });
      this.questionForm.controls.opcionCorrecta.markAsTouched();
      return;
    }

    if (tipo === 'Cerrada' && opcionesCorrectas.some((option) => !parsedOptions.includes(option))) {
      this.questionForm.controls.opcionCorrecta.setErrors({ required: true });
      this.questionForm.controls.opcionCorrecta.markAsTouched();
      return;
    }

    survey.questions.push({
      id: Date.now(),
      enunciado,
      tipo,
      esObligatoria,
      opcionesCorrectas,
      opciones: parsedOptions
    });

    this.questionForm.reset({
      enunciado: '',
      tipo: 'Cerrada',
      esObligatoria: true,
      opciones: '',
      opcionCorrecta: ''
    });
    this.selectedCorrectOptions = [];
  }

  shouldShowOptions(): boolean {
    const type = this.questionForm.controls.tipo.value;
    return type === 'Cerrada' || type === 'Ranking';
  }

  shouldShowTrueFalse(): boolean {
    return this.questionForm.controls.tipo.value === 'Verdadero/Falso';
  }

  optionPreview(): string[] {
    return this.parseOptions(this.questionForm.controls.opciones.value);
  }

  toggleCorrectOption(option: string): void {
    this.questionForm.controls.opcionCorrecta.setErrors(null);
    this.selectedCorrectOptions = this.isCorrectOptionSelected(option)
      ? this.selectedCorrectOptions.filter((selectedOption) => selectedOption !== option)
      : [...this.selectedCorrectOptions, option];
  }

  isCorrectOptionSelected(option: string): boolean {
    return this.selectedCorrectOptions.includes(option);
  }

  onQuestionTypeChange(): void {
    this.selectedCorrectOptions = [];
    this.questionForm.controls.opcionCorrecta.setValue('');
    this.questionForm.controls.opcionCorrecta.setErrors(null);
  }

  private parseOptions(options: string): string[] {
    return options
      .split('\n')
      .map((option) => option.trim())
      .filter(Boolean);
  }
}
