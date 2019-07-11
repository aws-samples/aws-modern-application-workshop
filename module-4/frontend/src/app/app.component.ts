import { Component, OnInit } from '@angular/core';
import { AmplifyService } from 'aws-amplify-angular';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthComponent } from './auth/auth.component';

@Component({
  selector: 'mm-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Mythical Mysfits';
  isLoggedIn = false;

  constructor(
    private amplifyService: AmplifyService,
    private modalService: NgbModal) {
  }

  async ngOnInit() {
    try {
      const user = await this.amplifyService.auth().currentAuthenticatedUser();
      console.log(user);
      this.isLoggedIn = true;
    } catch (e) {
      console.log(e);
      this.isLoggedIn = false;
    }
  }

  async login() {
    console.log();
    this.modalService.open(AuthComponent, { size: 'lg' })
      .result.then((closed) => {
        if (closed === 'logged_in') {
          console.log('showing logged in.');
          this.isLoggedIn = true;
        }
      }, (reason) => {
        console.log('reason:');
        console.log(reason);
      });
  }

  async logout() {
    await this.amplifyService.auth().signOut();
    this.isLoggedIn = false;
  }
}
