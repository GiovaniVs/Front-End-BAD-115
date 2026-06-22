export type SurveyQuestionType = 'CERRADA' | 'ABIERTA' | 'ESCALA' | 'RANKING';

export interface CreateSurveyOptionRequest {
  textoOpcion: string;
  esMixta: boolean;
}

export interface CreateSurveyQuestionRequest {
  enunciado: string;
  esObligatoria: boolean;
  orden: number;
  tipoPregunta: SurveyQuestionType;
  opciones: CreateSurveyOptionRequest[];
}

export interface CreateSurveyRequest {
  titulo: string;
  objetivo?: string;
  instrucciones?: string;
  preguntas: CreateSurveyQuestionRequest[];
}
