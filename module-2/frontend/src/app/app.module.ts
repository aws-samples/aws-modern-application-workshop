import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { MysticalMysfitProfileGridComponent } from './mystical-mysfit-profile-grid/mystical-mysfit-profile-grid.component';
import { MythicalMysfitProfileService } from './services/mythical-mysfit-profile.service';

@NgModule({
  declarations: [
    AppComponent,
    MysticalMysfitProfileGridComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [MythicalMysfitProfileService],
  bootstrap: [AppComponent]
})
export class AppModule { }
