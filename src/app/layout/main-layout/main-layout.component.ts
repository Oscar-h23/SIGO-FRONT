import { Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {
  readonly sidebarOpen = signal(false);
  readonly sidebarCollapsed = signal(false);
  readonly currentYear = new Date().getFullYear();

  toggleSidebar(): void {
    if (this.isMobile()) {
      this.sidebarOpen.update((value) => !value);
      return;
    }

    this.sidebarCollapsed.update((value) => !value);
  }

  closeSidebar(): void {
    if (this.isMobile()) {
      this.sidebarOpen.set(false);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.isMobile()) {
      this.sidebarOpen.set(false);
    }
  }

  private isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 900;
  }
}