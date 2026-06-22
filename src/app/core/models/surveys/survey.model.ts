export interface SurveyOptionDetail {
  idOpcion?: number;
  textoOpcion: string;
  esMixta: boolean;
}

export interface SurveyQuestionDetail {
  idPregunta?: number;
  enunciado: string;
  esObligatoria: boolean;
  orden: number;
  tipoPregunta: string;
  opciones: SurveyOptionDetail[];
}

export interface Survey {
  mensaje?: string;
  idEncuesta?: number;
  id_encuesta?: number;
  titulo: string;
  objetivo?: string;
  objective?: string;
  instrucciones?: string;
  estado?: string;
  fechaCreacion?: string;
  fecha_creacion?: string;
  creadorPor?: string;
  preguntas?: SurveyQuestionDetail[];
}
