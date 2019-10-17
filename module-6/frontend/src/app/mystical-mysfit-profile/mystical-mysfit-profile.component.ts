import { Component, OnInit, Input } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MythicalMysfitProfileService } from '../services/mythical-mysfit-profile.service';
import { MythicalMysfitProfile } from '../models/mythical-mysfit-profile';
import { AmplifyService } from 'aws-amplify-angular';

@Component({
  selector: 'mm-mystical-mysfit-profile',
  templateUrl: './mystical-mysfit-profile.component.html',
  styleUrls: ['./mystical-mysfit-profile.component.css']
})
export class MysticalMysfitProfileComponent implements OnInit {
  @Input() id;
  profileMysfit: MythicalMysfitProfile = new MythicalMysfitProfile();
  isLoggedIn = false;
  constructor(
    public activeModal: NgbActiveModal,
    private mysfitsService: MythicalMysfitProfileService,
    private amplify: AmplifyService
  ) { }

  async ngOnInit() {
    console.log(this.id);
    this.mysfitsService.retriveMysfitProfileById(this.id)
      .subscribe(mysfitsResponse => this.profileMysfit = mysfitsResponse);
    try {
      const session = await this.amplify.auth().currentSession();
      if (session) {
        this.isLoggedIn = true;
      }
    } catch (e) {
      console.log('not logged in.')
    }
  }

  async adoptMe() {
    const resp = await this.mysfitsService.adopt(this.id);
    console.log(resp);
  }

}
