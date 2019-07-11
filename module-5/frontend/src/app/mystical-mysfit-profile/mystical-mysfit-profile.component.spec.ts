import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MysticalMysfitProfileComponent } from './mystical-mysfit-profile.component';

describe('MysticalMysfitProfileComponent', () => {
  let component: MysticalMysfitProfileComponent;
  let fixture: ComponentFixture<MysticalMysfitProfileComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MysticalMysfitProfileComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MysticalMysfitProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
