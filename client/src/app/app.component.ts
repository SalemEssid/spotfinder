import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';
import { MobileNavComponent } from './components/mobile-nav/mobile-nav.component';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { NavigationHistoryService } from './services/navigation-history.service';

/** Page frame shared by every route: header, main content, footer, mobile tab bar, toasts. */
@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    MobileNavComponent,
    ToastContainerComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  constructor() {
    // Created at startup so it counts the very first navigation too.
    inject(NavigationHistoryService);

    // Accessibility: in a single-page app the browser does not announce a new page.
    // When the *page* changes (not just the filters or an #anchor), move the focus to <main>
    // so screen-reader users hear the new content, and keyboard users start from the top.
    let previousPath: string | null = null;
    inject(Router)
      .events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        const url = new URL(event.urlAfterRedirects, 'http://app');
        const pageChanged = previousPath !== null && url.pathname !== previousPath;
        previousPath = url.pathname;
        if (pageChanged && !url.hash) {
          setTimeout(() => document.getElementById('contenu')?.focus({ preventScroll: true }));
        }
      });
  }
}
