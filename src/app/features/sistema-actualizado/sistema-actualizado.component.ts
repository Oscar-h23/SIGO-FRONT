import { Component } from '@angular/core';

@Component({
  selector: 'app-sistema-actualizado',
  standalone: true,
  template: `
    <main class="update-page">
      <section class="update-card">
        <div class="brand">SIGO</div>
        <span class="eyebrow">Sistema Integral de Gestión Operativa</span>

        <h1>Nos actualizamos</h1>
        <p class="intro">
          Hemos actualizado SIGO para mejorar el acceso y la seguridad de tu cuenta.
        </p>

        <div class="info-box">
          <p>Ahora debes iniciar sesión utilizando tu <strong>código de trabajador</strong>.</p>
          <p>Tu contraseña inicial es:</p>
          <div class="password">12345</div>
          <p class="note">
            La primera vez que ingreses, el sistema te solicitará crear una nueva contraseña personal.
          </p>
        </div>

        <a class="login-button" href="https://sigo-front-prod.vercel.app/login">
          Ir al nuevo SIGO
        </a>

        <p class="footer-note">
          Utiliza el mismo código de trabajador que tienes asignado en Lima Expresa.
        </p>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; font-family: Inter, Arial, sans-serif; }
    .update-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box; background: linear-gradient(145deg,#f4f7fb,#e8eef7); color: #13233b; }
    .update-card { width: min(100%, 560px); box-sizing: border-box; padding: clamp(28px,6vw,48px); border: 1px solid #dbe4ef; border-radius: 22px; background: #fff; box-shadow: 0 22px 60px rgba(20,43,75,.12); text-align: center; }
    .brand { width: 70px; height: 70px; margin: 0 auto 16px; display: grid; place-items: center; border-radius: 18px; background: #123765; color: #fff; font-size: 1.15rem; font-weight: 900; letter-spacing: .08em; }
    .eyebrow { display: block; color: #607089; font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
    h1 { margin: 14px 0 10px; font-size: clamp(2rem,7vw,2.8rem); line-height: 1.05; color: #102c52; }
    .intro { margin: 0 auto 26px; max-width: 440px; color: #5b6a7e; line-height: 1.6; }
    .info-box { padding: 22px; border-radius: 16px; background: #f5f8fc; border: 1px solid #e0e7f0; }
    .info-box p { margin: 0 0 13px; line-height: 1.55; }
    .password { width: fit-content; margin: 12px auto 17px; padding: 10px 24px; border-radius: 10px; background: #e6eef9; color: #123765; font-size: 1.55rem; font-weight: 900; letter-spacing: .18em; }
    .note { margin-bottom: 0 !important; color: #56667b; font-size: .92rem; }
    .login-button { display: block; margin-top: 24px; padding: 15px 20px; border-radius: 12px; background: #123765; color: #fff; text-decoration: none; font-weight: 800; transition: transform .15s ease, opacity .15s ease; }
    .login-button:hover { opacity: .94; transform: translateY(-1px); }
    .footer-note { margin: 18px 0 0; color: #7a8798; font-size: .82rem; line-height: 1.5; }
    @media (max-width: 520px) { .update-page { padding: 14px; } .update-card { padding: 28px 20px; border-radius: 18px; } }
  `]
})
export class SistemaActualizadoComponent {}
