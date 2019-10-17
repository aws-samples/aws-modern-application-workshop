import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NotLoggedInWarningComponent } from './not-logged-in-warning.component';

describe('NotLoggedInWarningComponent', () => {
  let component: NotLoggedInWarningComponent;
  let fixture: ComponentFixture<NotLoggedInWarningComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NotLoggedInWarningComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NotLoggedInWarningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
