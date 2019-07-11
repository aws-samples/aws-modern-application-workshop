import { Component, OnInit } from '@angular/core';
import { MythicalMysfitProfile } from '../models/mythical-mysfit-profile';
import { MythicalMysfitProfileService } from '../services/mythical-mysfit-profile.service';

@Component({
  selector: 'mm-mystical-mysfit-profile-grid',
  templateUrl: './mystical-mysfit-profile-grid.component.html',
  styleUrls: ['./mystical-mysfit-profile-grid.component.css']
})
export class MysticalMysfitProfileGridComponent implements OnInit {
  mysfits: MythicalMysfitProfile[] = [];

  constructor(private mysfitsService: MythicalMysfitProfileService) { }

  ngOnInit() {
    this.mysfitsService.retriveMysfitProfiles()
      .subscribe(mysfitsResponse => this.mysfits = mysfitsResponse.mysfits);
  }

}
