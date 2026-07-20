import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeaveCalendar } from './leave-calendar';

describe('LeaveCalendar', () => {
  let component: LeaveCalendar;
  let fixture: ComponentFixture<LeaveCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveCalendar],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaveCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
