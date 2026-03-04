import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './features/nav/nav.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App { }
