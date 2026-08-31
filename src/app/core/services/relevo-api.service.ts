import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  Injectable,
  inject
} from '@angular/core';

import {
  Observable
} from 'rxjs';

import {
  environment
} from '../../../environments/environment';

import {
  ElementoRelevo,
  EvidenciaRelevoResponse,
  RelevoRequest,
  RelevoResponse,
  Via
} from '../models/relevo.models';


@Injectable({
  providedIn: 'root'
})
export class RelevoApiService {

  private readonly http =
    inject(HttpClient);

  private readonly api =
    environment.apiUrl;


  getVias(
    plazaId: number
  ): Observable<Via[]> {

    const params =
      new HttpParams()
        .set(
          'plazaId',
          plazaId.toString()
        );


    return this.http.get<Via[]>(
      `${this.api}/vias`,
      {
        params
      }
    );

  }


  getElementos():
    Observable<ElementoRelevo[]> {

    return this.http
      .get<ElementoRelevo[]>(
        `${this.api}/relevos/elementos`
      );

  }


  registrarRelevo(
    request: RelevoRequest
  ): Observable<RelevoResponse> {

    return this.http
      .post<RelevoResponse>(
        `${this.api}/relevos`,
        request
      );

  }


  obtenerRelevo(
    id: number
  ): Observable<RelevoResponse> {

    const url =
      `${this.api}/relevos/${id}`;


    console.log(
      'URL DETALLE RELEVO:',
      url
    );


    return this.http
      .get<RelevoResponse>(
        url
      );

  }


  listarRelevos(
    inicio?: string,
    fin?: string
  ): Observable<RelevoResponse[]> {

    let params =
      new HttpParams();


    if (inicio) {

      params =
        params.set(
          'inicio',
          inicio
        );

    }


    if (fin) {

      params =
        params.set(
          'fin',
          fin
        );

    }


    return this.http
      .get<RelevoResponse[]>(
        `${this.api}/relevos`,
        {
          params
        }
      );

  }


  subirEvidenciaChecklist(
    checklistId: number,
    file: File
  ): Observable<EvidenciaRelevoResponse> {

    const formData =
      new FormData();


    formData.append(
      'file',
      file
    );


    return this.http
      .post<EvidenciaRelevoResponse>(

        `${this.api}/relevos/checklist/${checklistId}/evidencias`,

        formData

      );

  }


  subirEvidenciaVia(
    relevoViaId: number,
    file: File
  ): Observable<EvidenciaRelevoResponse> {

    const formData =
      new FormData();


    formData.append(
      'file',
      file
    );


    return this.http
      .post<EvidenciaRelevoResponse>(

        `${this.api}/relevos/vias/${relevoViaId}/evidencias`,

        formData

      );

  }

}