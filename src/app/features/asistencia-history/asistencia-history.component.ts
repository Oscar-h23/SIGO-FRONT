import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { jsPDF } from 'jspdf';

import {
  AsistenciaResponse,
  Plaza
} from '../../core/models/asistencia.models';

import {
  AsistenciaApiService
} from '../../core/services/asistencia-api.service';

@Component({
  selector: 'app-asistencia-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './asistencia-history.component.html',
  styleUrl: './asistencia-history.component.css'
})
export class AsistenciaHistoryComponent implements OnInit {

  private readonly api =
    inject(AsistenciaApiService);

  /*
   * =========================================================
   * ASSETS DEL PDF
   * =========================================================
   */

  private readonly logoUrl =
    'assets/logo-lima-expresa.png';

  private readonly footerSeguridadUrl =
    'assets/footer-seguridad.png';

  readonly loading =
    signal(false);

  readonly loadingPlazas =
    signal(false);

  readonly generandoPdfId =
    signal<number | null>(null);

  readonly error =
    signal('');

  readonly registros =
    signal<AsistenciaResponse[]>([]);

  readonly plazas =
    signal<Plaza[]>([]);

  readonly expandedId =
    signal<number | null>(null);

  inicio = '';
  fin = '';
  plazaId: number | null = null;

  ngOnInit(): void {

    const hoy =
      this.obtenerFechaHoy();

    this.inicio = hoy;
    this.fin = hoy;

    this.cargarPlazas();
    this.cargar();
  }

  /*
   * =========================================================
   * PLAZAS
   * =========================================================
   */

  cargarPlazas(): void {

    this.loadingPlazas.set(true);

    this.api
      .getPlazas()
      .subscribe({

        next: (items) => {

          this.plazas.set(
            items.filter(
              plaza => plaza.activo
            )
          );

          this.loadingPlazas.set(false);
        },

        error: () => {

          this.loadingPlazas.set(false);

          this.error.set(
            'No se pudieron cargar las plazas.'
          );
        }

      });
  }

  /*
   * =========================================================
   * HISTORIAL
   * =========================================================
   */

  cargar(): void {

    this.error.set('');

    if (
      this.inicio &&
      this.fin &&
      this.inicio > this.fin
    ) {

      this.error.set(
        'La fecha inicial no puede ser posterior a la fecha final.'
      );

      return;
    }

    this.loading.set(true);

    this.api
      .listarAsistencias(
        this.inicio || undefined,
        this.fin || undefined,
        this.plazaId
      )
      .subscribe({

        next: (items) => {

          this.registros.set(items);

          this.expandedId.set(null);

          this.loading.set(false);
        },

        error: (err) => {

          this.error.set(
            this.errorMessage(err)
          );

          this.loading.set(false);
        }

      });
  }

  limpiar(): void {

    const hoy =
      this.obtenerFechaHoy();

    this.inicio = hoy;
    this.fin = hoy;
    this.plazaId = null;

    this.cargar();
  }

  cambiarPlaza(): void {

    this.cargar();
  }

  toggle(
    id: number
  ): void {

    this.expandedId.update(
      current =>
        current === id
          ? null
          : id
    );
  }

  badgeClass(
    value: number
  ): string {

    if (value >= 95) {
      return 'excellent';
    }

    if (value >= 85) {
      return 'good';
    }

    return 'warning';
  }

  /*
   * =========================================================
   * PDF
   * =========================================================
   */

  async generarPdf(
    registro: AsistenciaResponse
  ): Promise<void> {

    if (
      this.generandoPdfId() !== null
    ) {
      return;
    }

    this.generandoPdfId.set(
      registro.id
    );

    this.error.set('');

    try {

      const pdf =
        new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

      /*
       * COLORES
       */

      const navy:
        [number, number, number] =
        [0, 76, 145];

      const blue:
        [number, number, number] =
        [0, 139, 210];

      const lightBlue:
        [number, number, number] =
        [154, 214, 242];

      const white:
        [number, number, number] =
        [255, 255, 255];

      const black:
        [number, number, number] =
        [25, 35, 45];

      const green:
        [number, number, number] =
        [0, 132, 72];

      const red:
        [number, number, number] =
        [218, 0, 48];

      const yellow:
        [number, number, number] =
        [255, 205, 35];

      /*
       * =====================================================
       * PÁGINA 1
       * =====================================================
       */

      pdf.setFillColor(
        242,
        250,
        255
      );

      pdf.rect(
        0,
        0,
        297,
        210,
        'F'
      );

      /*
       * CABECERA
       */

      pdf.setFillColor(
        ...lightBlue
      );

      pdf.roundedRect(
        7,
        5,
        283,
        39,
        3,
        3,
        'F'
      );

      /*
       * LOGO
       */

      await this.dibujarLogo(
        pdf,
        navy
      );

      /*
       * PLAZA
       */

      const plazaTexto =
        this.obtenerNombrePlazaCompleto(
          registro.plazaId,
          registro.plaza
        );

      pdf.setTextColor(
        ...white
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(21);

      pdf.text(
        'Plaza:',
        46,
        20
      );

      pdf.setFillColor(
        ...white
      );

      pdf.roundedRect(
        78,
        8,
        150,
        18,
        5,
        5,
        'F'
      );

      pdf.setTextColor(
        ...black
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      const plazaFont =
        this.calcularFuenteParaAncho(
          pdf,
          plazaTexto,
          142,
          18,
          10
        );

      pdf.setFontSize(
        plazaFont
      );

      pdf.text(
        plazaTexto,
        153,
        19.8,
        {
          align: 'center',
          maxWidth: 142
        }
      );

      /*
       * FECHA
       */

      this.dibujarDatoCabecera(
        pdf,
        46,
        30,
        54,
        'Fecha:',
        this.formatearFecha(
          registro.fecha
        ),
        navy
      );

      /*
       * TURNO
       */

      this.dibujarDatoCabecera(
        pdf,
        104,
        30,
        40,
        'Turno:',
        registro.turno,
        navy
      );

      /*
       * CONTROLADOR
       */

      this.dibujarDatoCabeceraAdaptable(
        pdf,
        148,
        30,
        110,
        'Controlador:',
        registro.controlador,
        navy
      );

      /*
       * =====================================================
       * RESUMEN
       * =====================================================
       */

      const summaryY = 49;

      this.dibujarIndicador(
        pdf,
        7,
        summaryY,
        37,
        31,
        'Programados',
        String(
          registro.programados
        ).padStart(
          2,
          '0'
        ),
        navy
      );

      this.dibujarIndicador(
        pdf,
        47,
        summaryY,
        43,
        31,
        'Total asistencia',
        String(
          registro.presentes
        ).padStart(
          2,
          '0'
        ),
        navy
      );

      this.dibujarPorcentaje(
        pdf,
        93,
        summaryY,
        51,
        31,
        Number(
          registro.porcentaje ?? 0
        ),
        navy,
        green
      );

      this.dibujarIndicador(
        pdf,
        147,
        summaryY,
        30,
        31,
        'Ausencias',
        String(
          registro.ausentes
        ).padStart(
          2,
          '0'
        ),
        red
      );

      /*
       * Tabla resumida.
       * Máximo 4 personas.
       */

      this.dibujarTablaAusenciasResumen(
        pdf,
        registro,
        180,
        summaryY,
        110,
        31
      );

      /*
       * =====================================================
       * EVIDENCIAS
       * =====================================================
       */

      const evidenceHeaderY = 84;

      pdf.setFillColor(
        ...navy
      );

      pdf.roundedRect(
        7,
        evidenceHeaderY,
        283,
        8,
        2,
        2,
        'F'
      );

      pdf.setTextColor(
        ...white
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(11);

      pdf.text(
        'Registro de evidencias fotográficas',
        148.5,
        evidenceHeaderY + 5.5,
        {
          align: 'center'
        }
      );

      const evidencias =
        registro.evidencias ?? [];

      await this.dibujarEvidencia(
        pdf,
        evidencias[0]?.urlArchivo,
        7,
        94,
        92,
        51,
        '¡A calentar!',
        [220, 0, 75]
      );

      await this.dibujarEvidencia(
        pdf,
        evidencias[1]?.urlArchivo,
        102,
        94,
        92,
        51,
        'Foto de inicio de turno',
        yellow
      );

      await this.dibujarEvidencia(
        pdf,
        evidencias[2]?.urlArchivo,
        197,
        94,
        93,
        51,
        'Insp. tapones auditivos',
        blue
      );

      /*
       * =====================================================
       * NOTAS
       * =====================================================
       */

      const notesY = 149;

      pdf.setFillColor(
        ...white
      );

      pdf.setDrawColor(
        150,
        205,
        235
      );

      pdf.roundedRect(
        7,
        notesY,
        283,
        20,
        2,
        2,
        'FD'
      );

      pdf.setTextColor(
        ...navy
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(9.5);

      pdf.text(
        'Notas u observaciones',
        10,
        notesY + 5.5
      );

      pdf.setTextColor(
        60,
        70,
        80
      );

      pdf.setFont(
        'helvetica',
        'normal'
      );

      pdf.setFontSize(8.5);

      const notas =
        registro.notas?.trim() ||
        'Sin observaciones.';

      const lineasNotas =
        pdf.splitTextToSize(
          notas,
          275
        );

      pdf.text(
        lineasNotas.slice(
          0,
          2
        ),
        10,
        notesY + 12
      );

      /*
       * =====================================================
       * FOOTER DE SEGURIDAD
       * Imagen completa: personas + frase + peaje
       * =====================================================
       */

      await this.dibujarFooterSeguridad(
        pdf
      );

      /*
       * =====================================================
       * PÁGINA COMPLETA DE AUSENCIAS
       * Solo cuando existen más de 4.
       * =====================================================
       */

      if (
        registro.ausencias.length > 4
      ) {

        await this.dibujarListadoCompletoAusencias(
          pdf,
          registro,
          navy,
          blue
        );
      }

      /*
       * =====================================================
       * NUMERACIÓN FINAL
       * =====================================================
       */

      this.agregarNumeracionPaginas(
        pdf,
        navy
      );

      /*
       * =====================================================
       * GUARDAR
       * =====================================================
       */

      const nombrePlaza =
        registro.plaza
          .replace(
            /\s+/g,
            '_'
          )
          .replace(
            /[^\w-]/g,
            ''
          );

      pdf.save(
        `Asistencia_${nombrePlaza}_${registro.fecha}.pdf`
      );

    } catch (err) {

      console.error(
        'Error generando PDF:',
        err
      );

      this.error.set(
        'No se pudo generar el PDF de asistencia.'
      );

    } finally {

      this.generandoPdfId.set(
        null
      );
    }
  }

  /*
   * =========================================================
   * LOGO
   * =========================================================
   */

  private async dibujarLogo(
    pdf: jsPDF,
    navy:
      [number, number, number]
  ): Promise<void> {

    try {

      const logo =
        await this.cargarImagenPdf(
          this.logoUrl
        );

      const maxWidth = 36;
      const maxHeight = 34;

      const escala =
        Math.min(
          maxWidth / logo.ancho,
          maxHeight / logo.alto
        );

      const width =
        logo.ancho *
        escala;

      const height =
        logo.alto *
        escala;

      pdf.addImage(
        logo.dataUrl,
        logo.formato,
        10 +
        (
          maxWidth -
          width
        ) /
        2,
        7 +
        (
          maxHeight -
          height
        ) /
        2,
        width,
        height
      );

    } catch {

      pdf.setTextColor(
        ...navy
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(14);

      pdf.text(
        'LIMA',
        12,
        18
      );

      pdf.text(
        'EXPRESA',
        12,
        25
      );
    }
  }

  /*
   * =========================================================
   * FOOTER DE SEGURIDAD
   * =========================================================
   */

  private async dibujarFooterSeguridad(
    pdf: jsPDF
  ): Promise<void> {

    try {

      const footer =
        await this.cargarImagenPdf(
          this.footerSeguridadUrl
        );

      /*
       * A4 horizontal = 297 mm de ancho.
       * Usamos prácticamente todo el ancho del PDF,
       * dejando 4 mm de margen por lado.
       *
       * IMPORTANTE:
       * footer-seguridad.png debe ser la versión recortada,
       * sin el gran espacio transparente superior/inferior.
       */

      const x = 4;
      const y = 170;
      const ancho = 289;

      /*
       * Conservamos la proporción original del PNG.
       * Al estar recortado, ahora sí ocupará casi todo
       * el ancho útil del PDF.
       */

      const alto =
        ancho *
        footer.alto /
        footer.ancho;

      pdf.addImage(
        footer.dataUrl,
        footer.formato,
        x,
        y,
        ancho,
        alto
      );

    } catch (err) {

      console.error(
        'No se pudo cargar el footer de seguridad:',
        err
      );
    }
  }

  /*
   * =========================================================
   * PLAZA
   * =========================================================
   */

  private obtenerNombrePlazaCompleto(
    plazaId: number,
    codigoActual: string
  ): string {

    const plaza =
      this.plazas()
        .find(
          item =>
            item.id === plazaId
        );

    if (!plaza) {
      return codigoActual;
    }

    if (!plaza.descripcion) {
      return plaza.codigo;
    }

    return (
      `${plaza.codigo} - ` +
      `${plaza.descripcion}`
    );
  }

  /*
   * =========================================================
   * CABECERA
   * =========================================================
   */

  private dibujarDatoCabecera(
    pdf: jsPDF,
    x: number,
    y: number,
    ancho: number,
    etiqueta: string,
    valor: string,
    color:
      [number, number, number]
  ): void {

    const labelWidth = 17;

    pdf.setFillColor(
      ...color
    );

    pdf.roundedRect(
      x,
      y,
      labelWidth,
      9,
      1.5,
      1.5,
      'F'
    );

    pdf.setTextColor(
      255,
      255,
      255
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(8);

    pdf.text(
      etiqueta,
      x + 2,
      y + 5.8
    );

    pdf.setFillColor(
      255,
      255,
      255
    );

    pdf.roundedRect(
      x + labelWidth,
      y,
      ancho - labelWidth,
      9,
      1.5,
      1.5,
      'F'
    );

    pdf.setTextColor(
      20,
      20,
      20
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    const disponible =
      ancho -
      labelWidth -
      4;

    const fontSize =
      this.calcularFuenteParaAncho(
        pdf,
        valor,
        disponible,
        8,
        6
      );

    pdf.setFontSize(
      fontSize
    );

    pdf.text(
      valor,
      x +
      labelWidth +
      2,
      y + 5.8,
      {
        maxWidth:
          disponible
      }
    );
  }

  private dibujarDatoCabeceraAdaptable(
    pdf: jsPDF,
    x: number,
    y: number,
    ancho: number,
    etiqueta: string,
    valor: string,
    color:
      [number, number, number]
  ): void {

    const labelWidth = 30;

    pdf.setFillColor(
      ...color
    );

    pdf.roundedRect(
      x,
      y,
      labelWidth,
      9,
      1.5,
      1.5,
      'F'
    );

    pdf.setTextColor(
      255,
      255,
      255
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(8);

    pdf.text(
      etiqueta,
      x + 2,
      y + 5.8
    );

    pdf.setFillColor(
      255,
      255,
      255
    );

    pdf.roundedRect(
      x + labelWidth,
      y,
      ancho - labelWidth,
      9,
      1.5,
      1.5,
      'F'
    );

    const disponible =
      ancho -
      labelWidth -
      5;

    pdf.setTextColor(
      20,
      20,
      20
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    const fontSize =
      this.calcularFuenteParaAncho(
        pdf,
        valor,
        disponible,
        8.5,
        5.5
      );

    pdf.setFontSize(
      fontSize
    );

    pdf.text(
      valor,
      x +
      labelWidth +
      2,
      y + 5.8,
      {
        maxWidth:
          disponible
      }
    );
  }

  /*
   * =========================================================
   * INDICADOR
   * =========================================================
   */

  private dibujarIndicador(
    pdf: jsPDF,
    x: number,
    y: number,
    ancho: number,
    alto: number,
    titulo: string,
    valor: string,
    colorValor:
      [number, number, number]
  ): void {

    pdf.setFillColor(
      255,
      255,
      255
    );

    pdf.setDrawColor(
      150,
      205,
      235
    );

    pdf.roundedRect(
      x,
      y,
      ancho,
      alto,
      2,
      2,
      'FD'
    );

    pdf.setFillColor(
      0,
      125,
      195
    );

    pdf.roundedRect(
      x,
      y,
      ancho,
      8,
      2,
      2,
      'F'
    );

    pdf.setTextColor(
      255,
      255,
      255
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(7.8);

    pdf.text(
      titulo,
      x + ancho / 2,
      y + 5.3,
      {
        align: 'center'
      }
    );

    pdf.setTextColor(
      ...colorValor
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(20);

    pdf.text(
      valor,
      x + ancho / 2,
      y + 21.5,
      {
        align: 'center'
      }
    );
  }

  /*
   * =========================================================
   * PORCENTAJE
   * =========================================================
   */

  private dibujarPorcentaje(
    pdf: jsPDF,
    x: number,
    y: number,
    ancho: number,
    alto: number,
    porcentaje: number,
    azul:
      [number, number, number],
    verde:
      [number, number, number]
  ): void {

    const porcentajeSeguro =
      Math.max(
        0,
        Math.min(
          Number(
            porcentaje || 0
          ),
          100
        )
      );

    pdf.setFillColor(
      255,
      255,
      255
    );

    pdf.setDrawColor(
      150,
      205,
      235
    );

    pdf.roundedRect(
      x,
      y,
      ancho,
      alto,
      2,
      2,
      'FD'
    );

    pdf.setFillColor(
      ...azul
    );

    pdf.roundedRect(
      x,
      y,
      ancho,
      8,
      2,
      2,
      'F'
    );

    pdf.setTextColor(
      255,
      255,
      255
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(7.2);

    pdf.text(
      'Porcentaje de asistencia',
      x + ancho / 2,
      y + 5.3,
      {
        align: 'center'
      }
    );

    pdf.setDrawColor(
      205,
      215,
      220
    );

    pdf.setLineWidth(2.7);

    pdf.circle(
      x + 12.5,
      y + 19.5,
      6.7
    );

    pdf.setDrawColor(
      ...verde
    );

    const angulo =
      porcentajeSeguro /
      100 *
      360;

    const steps = 50;

    let anterior:
      {
        x: number;
        y: number;
      } | null = null;

    for (
      let i = 0;
      i <= steps;
      i++
    ) {

      const angle =
        (
          -90 +
          angulo *
          i /
          steps
        ) *
        Math.PI /
        180;

      const punto = {

        x:
          x +
          12.5 +
          6.7 *
          Math.cos(
            angle
          ),

        y:
          y +
          19.5 +
          6.7 *
          Math.sin(
            angle
          )

      };

      if (anterior) {

        pdf.line(
          anterior.x,
          anterior.y,
          punto.x,
          punto.y
        );
      }

      anterior =
        punto;
    }

    pdf.setLineWidth(0.2);

    pdf.setTextColor(
      ...verde
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(15);

    pdf.text(
      `${porcentajeSeguro.toFixed(1)}%`,
      x + 26,
      y + 21.5
    );
  }

  /*
   * =========================================================
   * TABLA RESUMEN PRIMERA PÁGINA
   * =========================================================
   */

  private dibujarTablaAusenciasResumen(
    pdf: jsPDF,
    registro: AsistenciaResponse,
    x: number,
    y: number,
    ancho: number,
    alto: number
  ): void {

    const navy:
      [number, number, number] =
      [0, 76, 145];

    const blue:
      [number, number, number] =
      [0, 139, 210];

    const white:
      [number, number, number] =
      [255, 255, 255];

    const text:
      [number, number, number] =
      [25, 35, 45];

    const border:
      [number, number, number] =
      [135, 195, 225];

    /*
     * CONTENEDOR
     */

    pdf.setFillColor(
      ...white
    );

    pdf.setDrawColor(
      ...border
    );

    pdf.setLineWidth(0.3);

    pdf.roundedRect(
      x,
      y,
      ancho,
      alto,
      2,
      2,
      'FD'
    );

    /*
     * TÍTULO
     */

    pdf.setFillColor(
      ...navy
    );

    pdf.roundedRect(
      x,
      y,
      ancho,
      7.5,
      2,
      2,
      'F'
    );

    pdf.setTextColor(
      ...white
    );

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(7.5);

    pdf.text(
      `Listado de ausencias (${registro.ausencias.length})`,
      x + ancho / 2,
      y + 5,
      {
        align: 'center'
      }
    );

    /*
     * COLUMNAS
     */

    const codigoWidth = 17;
    const nombreWidth = 57;

    const motivoWidth =
      ancho -
      codigoWidth -
      nombreWidth;

    const widths = [
      codigoWidth,
      nombreWidth,
      motivoWidth
    ];

    const headers = [
      'Código',
      'Nombre',
      'Motivo'
    ];

    const headerY =
      y + 7.5;

    const headerHeight =
      6;

    let cursorX =
      x;

    for (
      let i = 0;
      i < widths.length;
      i++
    ) {

      pdf.setFillColor(
        ...blue
      );

      pdf.setDrawColor(
        255,
        255,
        255
      );

      pdf.rect(
        cursorX,
        headerY,
        widths[i],
        headerHeight,
        'FD'
      );

      pdf.setTextColor(
        255,
        255,
        255
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(6.5);

      pdf.text(
        headers[i],
        cursorX +
        widths[i] / 2,
        headerY + 4.1,
        {
          align: 'center'
        }
      );

      cursorX +=
        widths[i];
    }

    /*
     * SIN AUSENCIAS
     */

    if (
      registro.ausencias.length === 0
    ) {

      pdf.setTextColor(
        100,
        110,
        120
      );

      pdf.setFont(
        'helvetica',
        'normal'
      );

      pdf.setFontSize(7);

      pdf.text(
        'Sin ausencias registradas',
        x + ancho / 2,
        headerY + 12,
        {
          align: 'center'
        }
      );

      return;
    }

    /*
     * Hasta 4.
     */

    const mostrar =
      registro.ausencias.slice(
        0,
        4
      );

    const espacioFilas =
      alto -
      7.5 -
      headerHeight;

    const rowHeight =
      espacioFilas /
      4;

    mostrar.forEach(
      (
        ausencia,
        index
      ) => {

        const rowY =
          headerY +
          headerHeight +
          index *
          rowHeight;

        if (
          index % 2 === 0
        ) {

          pdf.setFillColor(
            255,
            255,
            255
          );

        } else {

          pdf.setFillColor(
            241,
            249,
            253
          );
        }

        cursorX =
          x;

        for (
          const width of widths
        ) {

          pdf.setDrawColor(
            ...border
          );

          pdf.rect(
            cursorX,
            rowY,
            width,
            rowHeight,
            'FD'
          );

          cursorX +=
            width;
        }

        /*
         * Código
         */

        pdf.setTextColor(
          ...text
        );

        pdf.setFont(
          'helvetica',
          'bold'
        );

        pdf.setFontSize(5.8);

        pdf.text(
          String(
            ausencia.codigoTrabajador
          ),
          x +
          codigoWidth / 2,
          rowY +
          rowHeight / 2 +
          1.6,
          {
            align: 'center'
          }
        );

        /*
         * Nombre
         */

        const nombreFont =
          this.calcularFuenteParaAncho(
            pdf,
            ausencia.nombreTrabajador,
            nombreWidth - 3,
            5.5,
            4
          );

        pdf.setFont(
          'helvetica',
          'normal'
        );

        pdf.setFontSize(
          nombreFont
        );

        pdf.text(
          ausencia.nombreTrabajador,
          x +
          codigoWidth +
          1.5,
          rowY +
          rowHeight / 2 +
          1.6,
          {
            maxWidth:
              nombreWidth - 3
          }
        );

        /*
         * Motivo
         */

        const motivoFont =
          this.calcularFuenteParaAncho(
            pdf,
            ausencia.motivo,
            motivoWidth - 3,
            5.5,
            4
          );

        pdf.setFontSize(
          motivoFont
        );

        pdf.text(
          ausencia.motivo,
          x +
          codigoWidth +
          nombreWidth +
          1.5,
          rowY +
          rowHeight / 2 +
          1.6,
          {
            maxWidth:
              motivoWidth - 3
          }
        );
      }
    );

    /*
     * Si hay más de cuatro,
     * indicamos que continúa.
     */

    if (
      registro.ausencias.length > 4
    ) {

      pdf.setTextColor(
        ...navy
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(4.5);

      pdf.text(
        `Listado completo en la página siguiente`,
        x + ancho - 1.5,
        y + alto - 1,
        {
          align: 'right'
        }
      );
    }
  }

  /*
   * =========================================================
   * PÁGINAS DE AUSENCIAS COMPLETAS
   * =========================================================
   */

  private async dibujarListadoCompletoAusencias(
    pdf: jsPDF,
    registro: AsistenciaResponse,
    navy:
      [number, number, number],
    blue:
      [number, number, number]
  ): Promise<void> {

    /*
     * Cantidad segura por página.
     * Con esta altura caben bien 14 filas.
     */

    const filasPorPagina =
      14;

    const total =
      registro.ausencias.length;

    const cantidadPaginas =
      Math.ceil(
        total /
        filasPorPagina
      );

    for (
      let pagina = 0;
      pagina < cantidadPaginas;
      pagina++
    ) {

      const inicio =
        pagina *
        filasPorPagina;

      const fin =
        inicio +
        filasPorPagina;

      const bloque =
        registro.ausencias.slice(
          inicio,
          fin
        );

      pdf.addPage(
        'a4',
        'landscape'
      );

      /*
       * FONDO
       */

      pdf.setFillColor(
        247,
        252,
        255
      );

      pdf.rect(
        0,
        0,
        297,
        210,
        'F'
      );

      /*
       * CABECERA SUPERIOR
       */

      pdf.setFillColor(
        226,
        245,
        253
      );

      pdf.roundedRect(
        8,
        7,
        281,
        25,
        3,
        3,
        'F'
      );

      /*
       * LOGO
       */

      await this.dibujarLogoPaginaAusencias(
        pdf,
        navy
      );

      /*
       * TÍTULO
       */

      pdf.setFillColor(
        ...navy
      );

      pdf.roundedRect(
        60,
        10,
        220,
        13,
        3,
        3,
        'F'
      );

      pdf.setTextColor(
        255,
        255,
        255
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(15);

      pdf.text(
        'Listado completo de ausencias',
        170,
        18.5,
        {
          align: 'center'
        }
      );

      /*
       * INFORMACIÓN
       */

      const plaza =
        this.obtenerNombrePlazaCompleto(
          registro.plazaId,
          registro.plaza
        );

      pdf.setTextColor(
        20,
        40,
        65
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(8.5);

      pdf.text(
        'Plaza:',
        10,
        40
      );

      pdf.setFont(
        'helvetica',
        'normal'
      );

      pdf.text(
        plaza,
        22,
        40
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.text(
        'Fecha:',
        115,
        40
      );

      pdf.setFont(
        'helvetica',
        'normal'
      );

      pdf.text(
        this.formatearFecha(
          registro.fecha
        ),
        128,
        40
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.text(
        'Turno:',
        177,
        40
      );

      pdf.setFont(
        'helvetica',
        'normal'
      );

      pdf.text(
        registro.turno,
        190,
        40
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.text(
        'Total ausencias:',
        225,
        40
      );

      pdf.setFont(
        'helvetica',
        'normal'
      );

      pdf.text(
        String(
          registro.ausencias.length
        ).padStart(
          2,
          '0'
        ),
        253,
        40
      );

      /*
       * TABLA
       */

      this.dibujarTablaAusenciasCompleta(
        pdf,
        bloque,
        10,
        48,
        277,
        navy,
        blue
      );

      /*
       * CONTINUACIÓN
       */

      if (
        cantidadPaginas > 1
      ) {

        pdf.setTextColor(
          90,
          105,
          120
        );

        pdf.setFont(
          'helvetica',
          'italic'
        );

        pdf.setFontSize(7);

        pdf.text(
          `Bloque ${pagina + 1} de ${cantidadPaginas}`,
          10,
          199
        );
      }
    }
  }

  /*
   * =========================================================
   * TABLA COMPLETA
   * =========================================================
   */

  private dibujarTablaAusenciasCompleta(
    pdf: jsPDF,
    ausencias:
      AsistenciaResponse['ausencias'],
    x: number,
    y: number,
    ancho: number,
    navy:
      [number, number, number],
    blue:
      [number, number, number]
  ): void {

    const codigoWidth =
      34;

    const nombreWidth =
      130;

    const motivoWidth =
      ancho -
      codigoWidth -
      nombreWidth;

    const widths = [
      codigoWidth,
      nombreWidth,
      motivoWidth
    ];

    const headers = [
      'Código',
      'Nombre',
      'Motivo'
    ];

    const headerHeight =
      9;

    const rowHeight =
      9.5;

    let cursorX =
      x;

    /*
     * CABECERA
     */

    for (
      let i = 0;
      i < widths.length;
      i++
    ) {

      pdf.setFillColor(
        ...blue
      );

      pdf.setDrawColor(
        255,
        255,
        255
      );

      pdf.setLineWidth(0.3);

      pdf.rect(
        cursorX,
        y,
        widths[i],
        headerHeight,
        'FD'
      );

      pdf.setTextColor(
        255,
        255,
        255
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(9);

      pdf.text(
        headers[i],
        cursorX +
        widths[i] / 2,
        y + 6,
        {
          align: 'center'
        }
      );

      cursorX +=
        widths[i];
    }

    /*
     * FILAS
     */

    ausencias.forEach(
      (
        ausencia,
        index
      ) => {

        const rowY =
          y +
          headerHeight +
          index *
          rowHeight;

        /*
         * Fondo alternado
         */

        if (
          index % 2 === 0
        ) {

          pdf.setFillColor(
            255,
            255,
            255
          );

        } else {

          pdf.setFillColor(
            239,
            248,
            253
          );
        }

        cursorX =
          x;

        for (
          const width of widths
        ) {

          pdf.setDrawColor(
            145,
            195,
            220
          );

          pdf.setLineWidth(0.25);

          pdf.rect(
            cursorX,
            rowY,
            width,
            rowHeight,
            'FD'
          );

          cursorX +=
            width;
        }

        /*
         * Código
         */

        pdf.setTextColor(
          25,
          35,
          45
        );

        pdf.setFont(
          'helvetica',
          'bold'
        );

        pdf.setFontSize(8.5);

        pdf.text(
          String(
            ausencia.codigoTrabajador
          ),
          x +
          codigoWidth / 2,
          rowY + 6.2,
          {
            align: 'center'
          }
        );

        /*
         * Nombre
         */

        pdf.setFont(
          'helvetica',
          'normal'
        );

        const nombreSize =
          this.calcularFuenteParaAncho(
            pdf,
            ausencia.nombreTrabajador,
            nombreWidth - 8,
            8.5,
            6.5
          );

        pdf.setFontSize(
          nombreSize
        );

        pdf.text(
          ausencia.nombreTrabajador,
          x +
          codigoWidth +
          4,
          rowY + 6.2,
          {
            maxWidth:
              nombreWidth - 8
          }
        );

        /*
         * Motivo
         */

        const motivoSize =
          this.calcularFuenteParaAncho(
            pdf,
            ausencia.motivo,
            motivoWidth - 8,
            8.5,
            6.5
          );

        pdf.setFontSize(
          motivoSize
        );

        pdf.text(
          ausencia.motivo,
          x +
          codigoWidth +
          nombreWidth +
          4,
          rowY + 6.2,
          {
            maxWidth:
              motivoWidth - 8
          }
        );
      }
    );

    /*
     * Marco exterior
     */

    const alto =
      headerHeight +
      ausencias.length *
      rowHeight;

    pdf.setDrawColor(
      ...navy
    );

    pdf.setLineWidth(0.35);

    pdf.rect(
      x,
      y,
      ancho,
      alto
    );

    pdf.setLineWidth(0.2);
  }

  /*
   * =========================================================
   * LOGO PÁGINA AUSENCIAS
   * =========================================================
   */

  private async dibujarLogoPaginaAusencias(
    pdf: jsPDF,
    navy:
      [number, number, number]
  ): Promise<void> {

    try {

      const logo =
        await this.cargarImagenPdf(
          this.logoUrl
        );

      const maxWidth = 38;
      const maxHeight = 21;

      const escala =
        Math.min(
          maxWidth / logo.ancho,
          maxHeight / logo.alto
        );

      const width =
        logo.ancho *
        escala;

      const height =
        logo.alto *
        escala;

      pdf.addImage(
        logo.dataUrl,
        logo.formato,
        12 +
        (
          maxWidth -
          width
        ) /
        2,
        9 +
        (
          maxHeight -
          height
        ) /
        2,
        width,
        height
      );

    } catch {

      pdf.setTextColor(
        ...navy
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(12);

      pdf.text(
        'LIMA',
        14,
        17
      );

      pdf.text(
        'EXPRESA',
        14,
        24
      );
    }
  }

  /*
   * =========================================================
   * NÚMERO DE PÁGINAS
   * =========================================================
   */

  private agregarNumeracionPaginas(
    pdf: jsPDF,
    navy:
      [number, number, number]
  ): void {

    const totalPaginas =
      pdf.getNumberOfPages();

    for (
      let pagina = 1;
      pagina <= totalPaginas;
      pagina++
    ) {

      pdf.setPage(
        pagina
      );

      pdf.setTextColor(
        ...navy
      );

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(7);

      pdf.text(
        `Página ${pagina} de ${totalPaginas}`,
        287,
        205,
        {
          align: 'right'
        }
      );
    }
  }

  /*
   * =========================================================
   * EVIDENCIAS
   * =========================================================
   */

  private async dibujarEvidencia(
    pdf: jsPDF,
    url: string | undefined,
    x: number,
    y: number,
    ancho: number,
    alto: number,
    titulo: string,
    colorTitulo:
      [number, number, number]
  ): Promise<void> {

    pdf.setFillColor(
      255,
      255,
      255
    );

    pdf.setDrawColor(
      ...colorTitulo
    );

    pdf.roundedRect(
      x,
      y,
      ancho,
      alto,
      2,
      2,
      'FD'
    );

    pdf.setFillColor(
      ...colorTitulo
    );

    pdf.roundedRect(
      x,
      y,
      ancho,
      8,
      2,
      2,
      'F'
    );

    const amarillo =
      colorTitulo[0] > 220 &&
      colorTitulo[1] > 160;

    if (amarillo) {

      pdf.setTextColor(
        0,
        70,
        120
      );

    } else {

      pdf.setTextColor(
        255,
        255,
        255
      );
    }

    pdf.setFont(
      'helvetica',
      'bold'
    );

    pdf.setFontSize(8.5);

    pdf.text(
      titulo,
      x + ancho / 2,
      y + 5.4,
      {
        align: 'center'
      }
    );

    if (!url) {

      pdf.setTextColor(
        110,
        120,
        130
      );

      pdf.setFont(
        'helvetica',
        'normal'
      );

      pdf.setFontSize(8.5);

      pdf.text(
        'Sin evidencia registrada',
        x + ancho / 2,
        y + 29,
        {
          align: 'center'
        }
      );

      return;
    }

    try {

      const imagen =
        await this.cargarImagenPdf(
          url
        );

      const maxWidth =
        ancho - 5;

      const maxHeight =
        alto - 12;

      const escala =
        Math.min(
          maxWidth /
          imagen.ancho,
          maxHeight /
          imagen.alto
        );

      const width =
        imagen.ancho *
        escala;

      const height =
        imagen.alto *
        escala;

      const imageX =
        x +
        (
          ancho -
          width
        ) /
        2;

      const imageY =
        y +
        10 +
        (
          maxHeight -
          height
        ) /
        2;

      pdf.addImage(
        imagen.dataUrl,
        imagen.formato,
        imageX,
        imageY,
        width,
        height
      );

    } catch (err) {

      console.error(
        'No se pudo cargar evidencia:',
        url,
        err
      );

      pdf.setTextColor(
        190,
        40,
        40
      );

      pdf.setFont(
        'helvetica',
        'normal'
      );

      pdf.setFontSize(8);

      pdf.text(
        'No se pudo cargar la fotografía',
        x + ancho / 2,
        y + 29,
        {
          align: 'center'
        }
      );
    }
  }

  /*
   * =========================================================
   * IMÁGENES
   * =========================================================
   */

  private async cargarImagenPdf(
    url: string
  ): Promise<{
    dataUrl: string;
    formato: 'JPEG' | 'PNG';
    ancho: number;
    alto: number;
  }> {

    const response =
      await fetch(url);

    if (!response.ok) {

      throw new Error(
        `No se pudo cargar la imagen (${response.status}).`
      );
    }

    const blob =
      await response.blob();

    /*
     * Convertimos cualquier formato
     * recibido a PNG/JPEG compatible
     * con jsPDF.
     */

    const originalDataUrl =
      await this.blobToDataUrl(
        blob
      );

    const imagen =
      await this.cargarHtmlImage(
        originalDataUrl
      );

    /*
     * Si ya es PNG o JPEG,
     * podemos usarlo directamente.
     */

    const mime =
      blob.type
        .toLowerCase();

    if (
      mime.includes(
        'png'
      )
    ) {

      return {
        dataUrl:
          originalDataUrl,
        formato:
          'PNG',
        ancho:
          imagen.naturalWidth,
        alto:
          imagen.naturalHeight
      };
    }

    if (
      mime.includes(
        'jpeg'
      ) ||
      mime.includes(
        'jpg'
      )
    ) {

      return {
        dataUrl:
          originalDataUrl,
        formato:
          'JPEG',
        ancho:
          imagen.naturalWidth,
        alto:
          imagen.naturalHeight
      };
    }

    /*
     * WebP / AVIF / etc.
     * Lo convertimos mediante canvas.
     */

    const canvas =
      document.createElement(
        'canvas'
      );

    canvas.width =
      imagen.naturalWidth;

    canvas.height =
      imagen.naturalHeight;

    const context =
      canvas.getContext(
        '2d'
      );

    if (!context) {

      throw new Error(
        'No se pudo preparar la imagen para el PDF.'
      );
    }

    context.drawImage(
      imagen,
      0,
      0
    );

    const jpegDataUrl =
      canvas.toDataURL(
        'image/jpeg',
        0.9
      );

    return {
      dataUrl:
        jpegDataUrl,
      formato:
        'JPEG',
      ancho:
        imagen.naturalWidth,
      alto:
        imagen.naturalHeight
    };
  }

  private blobToDataUrl(
    blob: Blob
  ): Promise<string> {

    return new Promise<string>(
      (
        resolve,
        reject
      ) => {

        const reader =
          new FileReader();

        reader.onload =
          () => {

            if (
              typeof reader.result ===
              'string'
            ) {

              resolve(
                reader.result
              );

            } else {

              reject(
                new Error(
                  'No se pudo convertir la imagen.'
                )
              );
            }
          };

        reader.onerror =
          () => {

            reject(
              new Error(
                'No se pudo leer la imagen.'
              )
            );
          };

        reader.readAsDataURL(
          blob
        );
      }
    );
  }

  private cargarHtmlImage(
    dataUrl: string
  ): Promise<HTMLImageElement> {

    return new Promise<HTMLImageElement>(
      (
        resolve,
        reject
      ) => {

        const image =
          new Image();

        image.onload =
          () => {

            resolve(
              image
            );
          };

        image.onerror =
          () => {

            reject(
              new Error(
                'No se pudo cargar la imagen.'
              )
            );
          };

        image.src =
          dataUrl;
      }
    );
  }

  /*
   * =========================================================
   * FUENTE ADAPTABLE
   * =========================================================
   */

  private calcularFuenteParaAncho(
    pdf: jsPDF,
    texto: string,
    anchoDisponible: number,
    maxFontSize: number,
    minFontSize: number
  ): number {

    const textoSeguro =
      texto ?? '';

    let fontSize =
      maxFontSize;

    pdf.setFontSize(
      fontSize
    );

    while (
      pdf.getTextWidth(
        textoSeguro
      ) >
        anchoDisponible &&
      fontSize >
        minFontSize
    ) {

      fontSize -=
        0.25;

      pdf.setFontSize(
        fontSize
      );
    }

    return fontSize;
  }

  /*
   * =========================================================
   * FECHA
   * =========================================================
   */

  private formatearFecha(
    fecha: string
  ): string {

    if (!fecha) {
      return '';
    }

    const partes =
      fecha.split('-');

    if (
      partes.length !== 3
    ) {
      return fecha;
    }

    return (
      `${partes[2]}/` +
      `${partes[1]}/` +
      `${partes[0]}`
    );
  }

  private obtenerFechaHoy(): string {

    const fecha =
      new Date();

    const anio =
      fecha.getFullYear();

    const mes =
      String(
        fecha.getMonth() + 1
      ).padStart(
        2,
        '0'
      );

    const dia =
      String(
        fecha.getDate()
      ).padStart(
        2,
        '0'
      );

    return (
      `${anio}-${mes}-${dia}`
    );
  }

  /*
   * =========================================================
   * ERRORES
   * =========================================================
   */

  private errorMessage(
    err: unknown
  ): string {

    const e =
      err as {
        error?: {
          message?: string;
        } | string;
      };

    if (
      typeof e?.error ===
      'string'
    ) {

      return e.error;
    }

    return (
      e?.error?.message ??
      'No se pudo cargar el historial de asistencias.'
    );
  }
}