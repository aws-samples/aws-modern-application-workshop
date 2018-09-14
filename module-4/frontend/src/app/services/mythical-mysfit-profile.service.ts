import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MythicalMysfitResponse } from '../models/mythical-mysfit-response';
import { environment } from '../../environments/environment';
import { AmplifyService } from 'aws-amplify-angular';
import { MythicalMysfitProfile } from '../models/mythical-mysfit-profile';

@Injectable()
export class MythicalMysfitProfileService {
  mysfitsApi: string;
  constructor(
    private http: HttpClient,
    private amplify: AmplifyService
  ) {
    this.mysfitsApi = environment.mysfitsApiUrl;
  }

  retriveMysfitProfiles(): Observable<MythicalMysfitResponse> {
    return this.http.get<MythicalMysfitResponse>(`${this.mysfitsApi}/mysfits`);
  }

  retriveMysfitProfileById(mysfitId: string): Observable<MythicalMysfitProfile> {
    return this.http.get<MythicalMysfitProfile>(`${this.mysfitsApi}/mysfits/${mysfitId}`);
  }

  filterMysfitProfiles(filter: string, value: string): Observable<MythicalMysfitResponse> {
    const qs = {
      filter,
      value
    }
    return this.http.get<MythicalMysfitResponse>(`${this.mysfitsApi}/mysfits`, {
      params: qs
    });
  }

  async like(mysfitId: string) {
    const path = `/mysfits/${mysfitId}/like`;
    await this.amplify.api().post('mm-api', path, { body: {} })
    // return this.http.post(`${this.mysfitsApi}/mysfits`);
  }

  async adopt(mysfitId: string) {
    const path = `/mysfits/${mysfitId}/adopt`;
    await this.amplify.api().post('mm-api', path, { body: {} })
    // return this.http.post(`${this.mysfitsApi}/mysfits`);
  }
}
