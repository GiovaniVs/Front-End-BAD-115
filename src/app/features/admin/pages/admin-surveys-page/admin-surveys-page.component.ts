import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-surveys-page',
  templateUrl: './admin-surveys-page.component.html',
  styleUrl: './admin-surveys-page.component.css'
})
export class AdminSurveysPageComponent {
  readonly surveys: unknown[] = [];
}
