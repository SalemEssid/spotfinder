import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="footer__inner">
        <nav aria-label="Liens du pied de page">
          <a routerLink="/a-propos">À propos</a>
          <span aria-hidden="true">·</span>
          <a routerLink="/a-propos" fragment="contact">Contact</a>
          <span aria-hidden="true">·</span>
          <a routerLink="/a-propos" fragment="mentions">Mentions légales</a>
        </nav>
        <p>© SpotFinder 2026 · Projet étudiant SUP’COM · Données fictives</p>
      </div>
    </footer>
  `,
  styles: `
    .footer {
      background: var(--encre);
      color: var(--texte-inverse);
    }

    .footer__inner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      width: min(100% - 2rem, var(--container));
      min-height: 64px;
      margin-inline: auto;
      padding-block: var(--space-4);
      font-size: var(--fs-legende);
    }

    nav {
      display: flex;
      gap: var(--space-2);
    }

    a {
      color: var(--texte-inverse);

      &:hover {
        color: var(--menthe);
      }
    }

    p {
      color: #c4cdd0; // light grey on ink: contrast 9.2:1
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {}
