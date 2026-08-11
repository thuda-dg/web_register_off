import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <section>
      <h1>Welcome</h1>
      <p>You are authenticated.</p>
    </section>
  `
})
export class HomeComponent {}
