import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  ImageCropperComponent,
  ImageCroppedEvent,
  ImageTransform
} from 'ngx-image-cropper';


@Component({
  selector: 'app-image-cropper-modal',

  standalone: true,

  imports: [
    CommonModule,
    ImageCropperComponent
  ],

  templateUrl:
    './image-cropper-modal.component.html',

  styleUrl:
    './image-cropper-modal.component.css'
})
export class ImageCropperModalComponent
implements OnChanges {

  /*
   * =========================================================
   * INPUTS
   * =========================================================
   */

  @Input()
  visible = false;

  @Input()
  imageFile: File | null = null;

  @Input()
  titulo = 'Editar fotografía';


  /*
   * =========================================================
   * OUTPUTS
   * =========================================================
   */

  @Output()
  cancelar =
    new EventEmitter<void>();

  @Output()
  confirmar =
    new EventEmitter<File>();


  /*
   * =========================================================
   * CONFIGURACIÓN DEL RECORTE
   * =========================================================
   *
   * El PDF utiliza aproximadamente:
   *
   * 92 mm x 70 mm
   *
   * Por eso usamos exactamente
   * la misma proporción.
   */

  readonly aspectRatio =
    100 / 70;

  /*
   * Resolución final.
   *
   * 1200 / 913 ≈ 100 / 70
   */

  readonly outputWidth =
    1200;

  readonly outputHeight =
    840;


  /*
   * =========================================================
   * ESTADO
   * =========================================================
   */

  croppedBlob: Blob | null =
    null;

  previewUrl: string | null =
    null;

  loading =
    false;

  error =
    '';

  transform: ImageTransform = {
    scale: 1,
    rotate: 0
  };

  scale =
    1;

  rotation =
    0;


  /*
   * =========================================================
   * CAMBIO DE IMAGEN
   * =========================================================
   */

  ngOnChanges(
    changes: SimpleChanges
  ): void {

    if (
      changes['imageFile'] &&
      this.imageFile
    ) {

      this.resetEditor();
    }
  }


  /*
   * =========================================================
   * IMAGEN RECORTADA
   * =========================================================
   */

  imageCropped(
    event: ImageCroppedEvent
  ): void {

    /*
     * ngx-image-cropper puede entregar
     * directamente un Blob.
     */

    if (event.blob) {

      this.croppedBlob =
        event.blob;

      this.actualizarPreview(
        event.blob
      );

      return;
    }


    /*
     * Fallback por si la versión instalada
     * devuelve base64.
     */

    if (event.base64) {

      this.base64ToBlob(
        event.base64
      )
      .then(blob => {

        this.croppedBlob =
          blob;

        this.actualizarPreview(
          blob
        );
      });
    }
  }


  /*
   * =========================================================
   * IMAGEN CARGADA
   * =========================================================
   */

  imageLoaded(): void {

    this.loading =
      false;

    this.error =
      '';
  }


  /*
   * =========================================================
   * ERROR
   * =========================================================
   */

  loadImageFailed(): void {

    this.loading =
      false;

    this.error =
      'No se pudo cargar la fotografía seleccionada.';
  }


  /*
   * =========================================================
   * ZOOM
   * =========================================================
   */

  zoomIn(): void {

    this.scale =
      Math.min(
        this.scale + 0.1,
        3
      );

    this.actualizarTransform();
  }


  zoomOut(): void {

    this.scale =
      Math.max(
        this.scale - 0.1,
        1
      );

    this.actualizarTransform();
  }


  onZoomChange(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    this.scale =
      Number(
        input.value
      );

    this.actualizarTransform();
  }


  /*
   * =========================================================
   * ROTACIÓN
   * =========================================================
   */

  rotateLeft(): void {

    this.rotation -=
      90;

    this.actualizarTransform();
  }


  rotateRight(): void {

    this.rotation +=
      90;

    this.actualizarTransform();
  }


  /*
   * =========================================================
   * ACTUALIZAR TRANSFORMACIÓN
   * =========================================================
   */

  private actualizarTransform(): void {

    this.transform = {
      ...this.transform,

      scale:
        this.scale,

      rotate:
        this.rotation
    };
  }


  /*
   * =========================================================
   * CONFIRMAR
   * =========================================================
   */

  confirmarRecorte(): void {

    if (
      !this.croppedBlob
    ) {

      this.error =
        'Ajusta la fotografía antes de continuar.';

      return;
    }


    /*
     * Generamos un nuevo File.
     *
     * Este será el archivo que posteriormente
     * se enviará a Cloudinary.
     */

    const nombre =
      `evidencia_${Date.now()}.jpg`;

    const file =
      new File(
        [
          this.croppedBlob
        ],
        nombre,
        {
          type:
            'image/jpeg',

          lastModified:
            Date.now()
        }
      );


    this.confirmar.emit(
      file
    );
  }


  /*
   * =========================================================
   * CANCELAR
   * =========================================================
   */

  cancelarEdicion(): void {

    this.limpiarPreview();

    this.cancelar.emit();
  }


  /*
   * =========================================================
   * RESET
   * =========================================================
   */

  private resetEditor(): void {

    this.loading =
      true;

    this.error =
      '';

    this.scale =
      1;

    this.rotation =
      0;

    this.croppedBlob =
      null;

    this.limpiarPreview();

    this.transform = {
      scale: 1,
      rotate: 0
    };
  }


  /*
   * =========================================================
   * PREVIEW
   * =========================================================
   */

  private actualizarPreview(
    blob: Blob
  ): void {

    this.limpiarPreview();

    this.previewUrl =
      URL.createObjectURL(
        blob
      );
  }


  private limpiarPreview(): void {

    if (
      this.previewUrl
    ) {

      URL.revokeObjectURL(
        this.previewUrl
      );

      this.previewUrl =
        null;
    }
  }


  /*
   * =========================================================
   * BASE64 -> BLOB
   * =========================================================
   */

  private async base64ToBlob(
    base64: string
  ): Promise<Blob> {

    const response =
      await fetch(
        base64
      );

    return await response.blob();
  }
}