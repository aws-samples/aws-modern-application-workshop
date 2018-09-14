import { Component, OnInit } from '@angular/core';
import { MythicalMysfitProfile } from '../models/mythical-mysfit-profile';
import { MythicalMysfitProfileService } from '../services/mythical-mysfit-profile.service';
import { MythicalMysfitFilters } from '../models/mythical-mysfit-filters';
import { environment } from '../../environments/environment';
import { MysticalMysfitProfileComponent } from '../mystical-mysfit-profile/mystical-mysfit-profile.component';
import { NotLoggedInWarningComponent } from '../not-logged-in-warning/not-logged-in-warning.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AmplifyService } from 'aws-amplify-angular';

@Component({
  selector: 'mm-mystical-mysfit-profile-grid',
  templateUrl: './mystical-mysfit-profile-grid.component.html',
  styleUrls: ['./mystical-mysfit-profile-grid.component.css']
})
export class MysticalMysfitProfileGridComponent implements OnInit {
  mysfits: MythicalMysfitProfile[] = [];
  filterOptionsList: MythicalMysfitFilters = new MythicalMysfitFilters;
  notLoggedIn = false;

  constructor(
    private mysfitsService: MythicalMysfitProfileService,
    private modalService: NgbModal,
    private amplify: AmplifyService
  ) { }

  ngOnInit() {
    this.filterOptionsList.categories = environment.categories;
    this.mysfitsService.retriveMysfitProfiles()
      .subscribe(mysfitsResponse => this.mysfits = mysfitsResponse.mysfits);
  }

  viewProfile(mysfitId) {
    console.log(mysfitId);
    const modalRef = this.modalService.open(MysticalMysfitProfileComponent, { size: 'lg' })
    modalRef.componentInstance.id = mysfitId;
  }

  queryMysfits(title, selection) {
    console.log(title);
    console.log(selection);
    this.mysfitsService.filterMysfitProfiles(title, selection)
      .subscribe(mysfitsResponse => {
        console.log(mysfitsResponse);
        console.log(mysfitsResponse.mysfits);
        this.mysfits = mysfitsResponse.mysfits;
      });
  }

  removeFilter() {
    this.mysfitsService.retriveMysfitProfiles()
      .subscribe(mysfitsResponse => this.mysfits = mysfitsResponse.mysfits);
  }

  async like(mysfitsId) {
    try {
      const session = await this.amplify.auth().currentSession();
    } catch (e) {
      this.notLoggedIn = true;
      console.log('not logged in');
      this.modalService.open(NotLoggedInWarningComponent)
      return;
    }
    console.log('like');
    console.log(mysfitsId)
    const resp = await this.mysfitsService.like(mysfitsId);
    const i = this.mysfits.findIndex((mysfit) => mysfit.mysfitId === mysfitsId);
    if (i >= 0) this.mysfits[i].didLike = true;
    console.log(resp);
  }
}
