import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MysticalMysfitProfileGridComponent } from './mystical-mysfit-profile-grid.component';

describe('MysticalMysfitProfileComponent', () => {
  let component: MysticalMysfitProfileGridComponent;
  let fixture: ComponentFixture<MysticalMysfitProfileGridComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MysticalMysfitProfileGridComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MysticalMysfitProfileGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
