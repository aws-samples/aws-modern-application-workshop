import { Observable, of } from 'rxjs';
import { MythicalMysfitResponse } from '../models/mythical-mysfit-response';

export class MythicalMysfitProfileService {
  constructor() { }

  retriveMysfitProfiles(): Observable<MythicalMysfitResponse> {
    const data = [{
      mysfitId: '4e53920c-505a-4a90-a694-b9300791f0ae',
      name: 'Evangeline',
      species: 'Chimera',
      age: 43,
      goodevil: 'Evil',
      lawchaos: 'Lawful',
      thumbImageUri: 'https://www.mythicalmysfits.com/images/chimera_thumb.png'
    },
    {
      mysfitId: '2b473002-36f8-4b87-954e-9a377e0ccbec',
      name: 'Pauly',
      species: 'Cyclops',
      age: 2,
      goodevil: 'Neutral',
      lawchaos: 'Lawful',
      thumbImageUri: 'https://www.mythicalmysfits.com/images/cyclops_thumb.png'
    },
    {
      mysfitId: '0e37d916-f960-4772-a25a-01b762b5c1bd',
      name: 'CoCo',
      species: 'Dragon',
      age: 501,
      goodevil: 'Good',
      lawchaos: 'Chaotic',
      thumbImageUri: 'https://www.mythicalmysfits.com/images/dragon_thumb.png'
    },
    {
      mysfitId: 'da5303ae-5aba-495c-b5d6-eb5c4a66b941',
      name: 'Gretta',
      species: 'Gorgon',
      age: 31,
      goodevil: 'Evil',
      lawchaos: 'Neutral',
      thumbImageUri: 'https://www.mythicalmysfits.com/images/gorgon_thumb.png'
    },
    {
      mysfitId: 'b41ff031-141e-4a8d-bb56-158a22bea0b3',
      name: 'Snowflake',
      species: 'Yeti',
      age: 13,
      goodevil: 'Evil',
      lawchaos: 'Neutral',
      thumbImageUri: 'https://www.mythicalmysfits.com/images/yeti_thumb.png'
    },
    {
      mysfitId: '3f0f196c-4a7b-43af-9e29-6522a715342d',
      name: 'Gary',
      species: 'Kraken',
      age: 2709,
      goodevil: 'Neutral',
      lawchaos: 'Chaotic',
      thumbImageUri: 'https://www.mythicalmysfits.com/images/kraken_thumb.png'
    }];
    return of({ mysfits: data });
  }
}
