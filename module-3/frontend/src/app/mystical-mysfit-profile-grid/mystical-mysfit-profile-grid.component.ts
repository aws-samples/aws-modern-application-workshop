import { Component, OnInit } from '@angular/core';
import { MythicalMysfitProfile } from '../models/mythical-mysfit-profile';
import { MythicalMysfitProfileService } from '../services/mythical-mysfit-profile.service';
import { MythicalMysfitFilters } from '../models/mythical-mysfit-filters';
import { environment } from '../../environments/environment';

@Component({
  selector: 'mm-mystical-mysfit-profile-grid',
  templateUrl: './mystical-mysfit-profile-grid.component.html',
  styleUrls: ['./mystical-mysfit-profile-grid.component.css']
})
export class MysticalMysfitProfileGridComponent implements OnInit {
  mysfits: MythicalMysfitProfile[] = [];
  filterOptionsList: MythicalMysfitFilters = new MythicalMysfitFilters;

  constructor(private mysfitsService: MythicalMysfitProfileService) { }

  ngOnInit() {
    this.filterOptionsList.categories = environment.categories;
    this.mysfitsService.retriveMysfitProfiles()
      .subscribe(mysfitsResponse => this.mysfits = mysfitsResponse.mysfits);
  }

  queryMysfits(title, selection) {
    console.log(title);
    console.log(selection);
    this.mysfitsService.filterMysfitProfiles(title, selection)
      .subscribe(mysfitsResponse => this.mysfits = mysfitsResponse.mysfits);
  }

  removeFilter() {
    this.mysfitsService.retriveMysfitProfiles()
      .subscribe(mysfitsResponse => this.mysfits = mysfitsResponse.mysfits);
  }
}
