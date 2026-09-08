import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from './../../../environments/environment';
import {
  ChatRequest,
  ChatResponse
} from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private readonly apiUrl =
    `${environment.apiUrl}/chat`;

  constructor(
    private readonly http: HttpClient
  ) {}

  enviarMensaje(
    message: string
  ): Observable<ChatResponse> {

    const body: ChatRequest = {
      message: message.trim()
    };

    return this.http.post<ChatResponse>(
      this.apiUrl,
      body
    );
  }
}
