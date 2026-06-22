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

export interface SurveyAssignment extends Survey {
  idAsignacion?: number;
  id_asignacion?: number;
  idParticipacion?: number;
  id_participacion?: number;
  idEncuestado?: number;
  id_encuestado?: number;
  correoEncuestado?: string;
  correo_encuestado?: string;
  tokenAcceso?: string;
  token_acceso?: string;
  estadoRespuesta?: string;
  estado_respuesta?: string;
  respondida?: boolean;
  completada?: boolean;
  fechaAsignacion?: string;
  fecha_asignacion?: string;
  fechaRespuesta?: string;
  fecha_respuesta?: string;
}

export interface PublicSurveyOption {
  idOpcion?: number;
  textoOpcion: string;
  esMixta?: boolean;
}

export interface PublicSurveyQuestion {
  idPregunta: number;
  enunciado: string;
  esObligatoria?: boolean;
  tipoPregunta: string;
  opciones?: PublicSurveyOption[];
}

export interface PublicSurvey {
  idEncuesta: number;
  titulo: string;
  objetivo?: string;
  instrucciones?: string;
  preguntas: PublicSurveyQuestion[];
}

export interface PublicSurveyAnswer {
  idPregunta: number;
  idOpcion?: number;
  textoRespuesta?: string;
}
