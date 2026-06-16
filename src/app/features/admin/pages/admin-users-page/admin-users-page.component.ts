import { Component } from '@angular/core';

interface ManagedUserGroup {
  title: string;
  description: string;
  role: string;
  count: number;
}

@Component({
  selector: 'app-admin-users-page',
  templateUrl: './admin-users-page.component.html',
  styleUrl: './admin-users-page.component.css'
})
export class AdminUsersPageComponent {
  readonly userGroups: ManagedUserGroup[] = [
    {
      title: 'Disenadores',
      description: 'Usuarios con privilegios para crear encuestas, preguntas y revisar resultados.',
      role: 'Rol ID 2',
      count: 0
    },
    {
      title: 'Usuarios encuestados',
      description: 'Participantes que ingresan para responder las encuestas asignadas.',
      role: 'Encuestado',
      count: 0
    }
  ];
}
