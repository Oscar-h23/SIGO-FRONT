import {
  AfterViewChecked,
  Component,
  ElementRef,
  ViewChild,
  signal
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  ChatService
} from '../../core/services/chat.service';

import {
  ChatMessage
} from '../../core/models/chat.model';

@Component({
  selector: 'app-chatbot',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent
  implements AfterViewChecked {

  @ViewChild('messagesContainer')
  private messagesContainer?:
    ElementRef<HTMLDivElement>;

  readonly abierto =
    signal(false);

  readonly cargando =
    signal(false);

  readonly mensajes =
    signal<ChatMessage[]>([
      {
        id: 1,
        role: 'asistente',
        text:
          'Hola. Soy el asistente de SIGO. ' +
          'Puedo ayudarte a consultar información de asistencia.',
        createdAt: new Date()
      }
    ]);

  mensajeActual = '';

  private ultimoId = 1;

  private debeHacerScroll =
    false;

  readonly sugerencias: string[] = [
    'Top 5 personas con más faltas este mes',
    '¿Cuántas faltas hubo este mes?',
    '¿Cuáles fueron los motivos de ausencia más frecuentes?',
    '¿Cuántas faltas hubo en P4?'
  ];

  constructor(
    private readonly chatApi:
      ChatService
  ) {}

  ngAfterViewChecked(): void {

    if (
      this.debeHacerScroll
    ) {
      this.scrollAlFinal();

      this.debeHacerScroll =
        false;
    }
  }

  alternarChat(): void {

    this.abierto.update(
      valor => !valor
    );

    if (
      this.abierto()
    ) {
      this.marcarScroll();
    }
  }

  cerrarChat(): void {

    this.abierto.set(
      false
    );
  }

  usarSugerencia(
    texto: string
  ): void {

    this.mensajeActual =
      texto;

    this.enviarMensaje();
  }

  manejarTecla(
    event: KeyboardEvent
  ): void {

    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {

      event.preventDefault();

      this.enviarMensaje();
    }
  }

  enviarMensaje(): void {

    const texto =
      this.mensajeActual
        .trim();

    if (
      !texto ||
      this.cargando()
    ) {
      return;
    }

    this.agregarMensaje(
      'usuario',
      texto
    );

    this.mensajeActual =
      '';

    this.cargando.set(
      true
    );

    this.chatApi
      .enviarMensaje(
        texto
      )
      .subscribe({

        next: respuesta => {

          const contenido =
            respuesta.response
              ?.trim();

          this.agregarMensaje(
            'asistente',
            contenido ||
              'No recibí una respuesta válida.'
          );

          this.cargando.set(
            false
          );
        },

        error: error => {

          console.error(
            'Error del chatbot SIGO:',
            error
          );

          this.agregarMensaje(
            'asistente',
            'No pude conectarme con el servicio. Intenta nuevamente.'
          );

          this.cargando.set(
            false
          );
        }
      });
  }

  limpiarConversacion(): void {

    this.mensajes.set([
      {
        id:
          ++this.ultimoId,

        role:
          'asistente',

        text:
          'Conversación reiniciada. ¿Qué deseas consultar?',

        createdAt:
          new Date()
      }
    ]);

    this.marcarScroll();
  }

  private agregarMensaje(
    role: ChatMessage['role'],
    text: string
  ): void {

    const nuevo:
      ChatMessage = {

        id:
          ++this.ultimoId,

        role,

        text,

        createdAt:
          new Date()
      };

    this.mensajes.update(
      actuales => [
        ...actuales,
        nuevo
      ]
    );

    this.marcarScroll();
  }

  private marcarScroll(): void {

    this.debeHacerScroll =
      true;
  }

  private scrollAlFinal(): void {

    const contenedor =
      this.messagesContainer
        ?.nativeElement;

    if (
      !contenedor
    ) {
      return;
    }

    contenedor.scrollTop =
      contenedor.scrollHeight;
  }
}