import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GanttTemporalComponent } from './gantt.component';

describe('GanttAtemporalComponent', () => {
  let component: GanttTemporalComponent;
  let fixture: ComponentFixture<GanttTemporalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GanttTemporalComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GanttTemporalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
