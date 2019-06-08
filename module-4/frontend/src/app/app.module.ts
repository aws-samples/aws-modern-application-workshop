import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AmplifyAngularModule, AmplifyService } from 'aws-amplify-angular';
import { NgbModalModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';
import { MysticalMysfitProfileGridComponent } from './mystical-mysfit-profile-grid/mystical-mysfit-profile-grid.component';
import { MythicalMysfitProfileService } from './services/mythical-mysfit-profile.service';
import { AuthComponent } from './auth/auth.component';
import { MysticalMysfitProfileComponent } from './mystical-mysfit-profile/mystical-mysfit-profile.component';
import { NotLoggedInWarningComponent } from './not-logged-in-warning/not-logged-in-warning.component';

@NgModule({
  declarations: [
    AppComponent,
    MysticalMysfitProfileGridComponent,
    AuthComponent,
    MysticalMysfitProfileComponent,
    NotLoggedInWarningComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AmplifyAngularModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModalModule,
    NgbDropdownModule
  ],
  providers: [MythicalMysfitProfileService, AmplifyService],
  bootstrap: [AppComponent],
  entryComponents: [AuthComponent, MysticalMysfitProfileComponent, NotLoggedInWarningComponent]
})
export class AppModule { }
