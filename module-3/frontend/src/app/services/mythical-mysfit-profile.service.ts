import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MythicalMysfitResponse } from '../models/mythical-mysfit-response';
import { environment } from '../../environments/environment';

@Injectable()
export class MythicalMysfitProfileService {
  mysfitsApi: string;
  constructor(
    private http: HttpClient
  ) {
    this.mysfitsApi = environment.mysfitsApiUrl;
  }

  retriveMysfitProfiles(): Observable<MythicalMysfitResponse> {
    return this.http.get<MythicalMysfitResponse>(`${this.mysfitsApi}/mysfits`);
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
}
