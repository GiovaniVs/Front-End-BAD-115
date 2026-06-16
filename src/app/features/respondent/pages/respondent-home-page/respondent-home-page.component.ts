import { Component } from '@angular/core';

interface AssignedSurvey {
  title: string;
  description: string;
  status: 'Pendiente' | 'Completada';
  questions: number;
  dueDate: string;
}

@Component({
  selector: 'app-respondent-home-page',
  templateUrl: './respondent-home-page.component.html',
  styleUrl: './respondent-home-page.component.css'
})
export class RespondentHomePageComponent {
  readonly surveys: AssignedSurvey[] = [
    {
      title: 'Encuesta de satisfaccion',
      description: 'Comparte tu experiencia con el servicio recibido.',
      status: 'Pendiente',
      questions: 8,
      dueDate: 'Disponible ahora'
    },
    {
      title: 'Preferencias de comunicacion',
      description: 'Ayudanos a conocer los canales que prefieres.',
      status: 'Pendiente',
      questions: 5,
      dueDate: 'Sin fecha limite'
    }
  ];
}
