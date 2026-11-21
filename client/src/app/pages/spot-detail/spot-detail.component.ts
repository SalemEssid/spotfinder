import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCheck,
  LucideHeart,
  LucideHourglass,
  LucideNavigation,
  LucidePlug,
  LucideSnowflake,
  LucideStar,
  LucideUsers,
  LucideVolume2,
  LucideWallet,
  LucideWifi,
} from '@lucide/angular';
import {
  catchError,
  EMPTY,
  filter,
  finalize,
  interval,
  map,
  merge,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { CrowdBadgeComponent } from '../../components/crowd-badge/crowd-badge.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { LiveMeterComponent } from '../../components/live-meter/live-meter.component';
import { MapViewComponent } from '../../components/map-view/map-view.component';
import { RatingBarsComponent } from '../../components/rating-bars/rating-bars.component';
import { ReportSheetComponent } from '../../components/report-sheet/report-sheet.component';
import { ReviewListComponent } from '../../components/review-list/review-list.component';
import { SpotIllustrationComponent } from '../../components/spot-illustration/spot-illustration.component';
import type { LiveMeter, ReportChoice, SpotDetail } from '../../models/spot.model';
import type { NewReview, Review } from '../../models/user.model';
import { ReviewFormComponent } from '../../components/review-form/review-form.component';
import { AccountService } from '../../services/account.service';
import { AuthService } from '../../services/auth.service';
import { ClockService } from '../../services/clock.service';
import { NavigationHistoryService } from '../../services/navigation-history.service';
import { SpotService } from '../../services/spot.service';
import { ToastService } from '../../services/toast.service';
import { apiErrorBody, apiErrorMessage } from '../../utils/api-error';
import {
  formatDistance,
  formatRating,
  formatTime,
  minutesUntil,
  NOISE_DESCRIPTIONS,
  PRICE_LABELS,
  SPOT_TYPE_LABELS,
  tunisWeekday,
  WEEK_ORDER,
  WEEKDAY_LABELS,
  wifiLabel,
} from '../../utils/format';
import { applyOptimisticReport, REPORT_CHOICES } from '../../utils/live-meter';
import { REFERENCE_POINT } from '../../utils/reference-point';

/** The Live Meter is re-fetched every minute while the page is open: it stays "live". */
const LIVE_REFRESH_MS = 60_000;

@Component({
  selector: 'app-spot-detail',
  imports: [
    RouterLink,
    CrowdBadgeComponent,
    EmptyStateComponent,
    LiveMeterComponent,
    MapViewComponent,
    RatingBarsComponent,
    ReportSheetComponent,
    ReviewListComponent,
    ReviewFormComponent,
    SpotIllustrationComponent,
    LucideStar,
    LucideArrowLeft,
    LucideCheck,
    LucideHeart,
    LucideHourglass,
    LucideNavigation,
    LucidePlug,
    LucideSnowflake,
    LucideUsers,
    LucideVolume2,
    LucideWallet,
    LucideWifi,
  ],
  templateUrl: './spot-detail.component.html',
  styleUrl: './spot-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpotDetailComponent {
  /** Route param /lieux/:id (bound by withComponentInputBinding). */
  readonly id = input.required<string>();
  /** ?signaler=1: open "Je suis ici" right away (used when coming back from the login page). */
  readonly signaler = input<string>();

  private readonly spotService = inject(SpotService);
  private readonly account = inject(AccountService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly history = inject(NavigationHistoryService);
  private readonly title = inject(Title);
  protected readonly auth = inject(AuthService);
  protected readonly clock = inject(ClockService);

  protected readonly status = signal<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  protected readonly errorMessage = signal('');
  protected readonly spot = signal<SpotDetail | null>(null);
  /** Kept apart from `spot` so it can be updated optimistically and refreshed every minute. */
  protected readonly liveMeter = signal<LiveMeter | null>(null);
  protected readonly nextReportAllowedAt = signal<string | null>(null);
  protected readonly isFavorite = signal(false);
  protected readonly reviews = signal<Review[] | null>(null);
  protected readonly sheetOpen = signal(false);
  protected readonly reporting = signal(false);
  protected readonly reviewFormOpen = signal(false);
  protected readonly postingReview = signal(false);
  private readonly reload$ = new Subject<void>();

  // --- What the template shows --------------------------------------------------------------
  protected readonly typeLabel = computed(() => SPOT_TYPE_LABELS[this.spot()?.type ?? 'autre']);

  /** "Ouvert · ferme à 22:00 · 350 m de SUP'COM" (mockup Fiche). */
  protected readonly infoLine = computed(() => {
    const spot = this.spot();
    if (!spot) return '';
    const parts = [
      spot.openNow ? `Ouvert · ferme à ${formatTime(spot.closesAt ?? '')}` : 'Fermé actuellement',
    ];
    if (spot.distanceMeters !== null)
      parts.push(`${formatDistance(spot.distanceMeters)} de ${REFERENCE_POINT.label}`);
    return parts.join(' · ');
  });

  protected readonly badges = computed(() => {
    const spot = this.spot();
    if (!spot) return [];
    const wifi =
      spot.ratings.wifi !== null
        ? `Wi-Fi ${formatRating(Math.round(spot.ratings.wifi))}/5`
        : wifiLabel(spot.equipment.wifiSpeed);
    return [wifi, `Prises : ${spot.equipment.outletsCount > 0 ? 'oui' : 'non'}`];
  });

  protected readonly equipment = computed(() => {
    const spot = this.spot();
    if (!spot) return null;
    const e = spot.equipment;
    return {
      wifi:
        e.wifiSpeed === 0
          ? 'Pas de Wi-Fi'
          : `${wifiLabel(e.wifiSpeed)} · environ ${e.wifiSpeed} Mb/s`,
      outlets:
        e.outletsCount === 0
          ? 'Pas de prise accessible'
          : `${e.outletsCount} prise${e.outletsCount > 1 ? 's' : ''}`,
      noise: NOISE_DESCRIPTIONS[e.noiseLevel],
      price: PRICE_LABELS[e.priceLevel] ?? '',
      airConditioning: e.airConditioning ? 'Climatisé' : 'Sans climatisation',
    };
  });

  /** Opening hours, Monday first; today in bold. */
  protected readonly week = computed(() => {
    const spot = this.spot();
    if (!spot) return [];
    const today = tunisWeekday(this.clock.now());
    return WEEK_ORDER.map((weekday) => {
      const slots = spot.openingHours.filter((h) => h.weekday === weekday);
      return {
        weekday,
        label: WEEKDAY_LABELS[weekday]!,
        isToday: weekday === today,
        text: slots.length
          ? slots.map((s) => `${formatTime(s.opensAt)} – ${formatTime(s.closesAt)}`).join(', ')
          : 'Fermé',
      };
    });
  });

  protected readonly cooldownMinutes = computed(() => {
    const next = this.nextReportAllowedAt();
    return next ? minutesUntil(next, this.clock.now()) : 0;
  });

  protected readonly directionsUrl = computed(() => {
    const spot = this.spot();
    if (!spot) return '';
    const from = `${REFERENCE_POINT.latitude},${REFERENCE_POINT.longitude}`;
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${from};${spot.latitude},${spot.longitude}`;
  });

  constructor() {
    const spotId$ = toObservable(this.id).pipe(map(Number));

    // The place itself (again on "Réessayer").
    merge(spotId$, this.reload$.pipe(map(() => Number(this.id()))))
      .pipe(
        tap(() => this.status.set('loading')),
        switchMap((id) =>
          this.spotService.get(id).pipe(
            map((spot) => ({ spot, error: null })),
            catchError((error: unknown) => of({ spot: null, error })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ spot, error }) => {
        if (spot) {
          this.spot.set(spot);
          this.liveMeter.set(spot.liveMeter);
          this.nextReportAllowedAt.set(spot.nextReportAllowedAt);
          this.isFavorite.set(spot.isFavorite);
          this.title.setTitle(`${spot.name} · SpotFinder`);
          this.status.set('ready');
        } else if (
          error instanceof HttpErrorResponse &&
          (error.status === 404 || error.status === 400)
        ) {
          this.status.set('not-found');
        } else {
          this.errorMessage.set(apiErrorMessage(error, 'Impossible de charger ce lieu.'));
          this.status.set('error');
        }
      });

    // Reviews load in parallel: if they fail, the rest of the page still works.
    spotId$
      .pipe(
        tap(() => this.reviews.set(null)),
        switchMap((id) => this.spotService.reviews(id).pipe(catchError(() => of([])))),
        takeUntilDestroyed(),
      )
      .subscribe((reviews) => this.reviews.set(reviews));

    // Keep the meter live while the page is open (paused during a report).
    spotId$
      .pipe(
        switchMap((id) =>
          interval(LIVE_REFRESH_MS).pipe(
            filter(
              () =>
                !this.reporting() && !this.sheetOpen() && document.visibilityState === 'visible',
            ),
            switchMap(() => this.spotService.liveMeter(id).pipe(catchError(() => EMPTY))),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((meter) => this.liveMeter.set(meter));

    // Back from the login page with ?signaler=1: open the sheet, then clean the URL.
    effect(() => {
      if (this.signaler() === '1' && this.status() === 'ready' && this.auth.isLoggedIn()) {
        untracked(() => {
          this.openReport();
          void this.router.navigate([], {
            queryParams: { signaler: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        });
      }
    });
  }

  protected retry(): void {
    this.reload$.next();
  }

  /** "← Explorer": go back to the (filtered) list if we came from it, otherwise open the Explorer. */
  protected goBack(): void {
    if (this.history.canGoBack()) this.location.back();
    else void this.router.navigate(['/explorer']);
  }

  protected openReport(): void {
    if (!this.auth.isLoggedIn()) {
      this.toast.info('Connectez-vous pour signaler l’affluence : ça prend 30 secondes.');
      void this.router.navigate(['/connexion'], {
        queryParams: { redirect: `/lieux/${this.id()}?signaler=1` },
      });
      return;
    }
    if (this.cooldownMinutes() > 0) return;
    this.sheetOpen.set(true);
  }

  /**
   * Optimistic update: the meter changes immediately with the value the server is going to compute,
   * then the server's answer replaces it. On error, the previous value comes back.
   */
  protected submitReport(choice: ReportChoice): void {
    const previousMeter = this.liveMeter();
    const occupancy = REPORT_CHOICES.find((c) => c.value === choice)!.occupancy;
    if (previousMeter)
      this.liveMeter.set(applyOptimisticReport(previousMeter, occupancy, new Date()));
    this.sheetOpen.set(false);
    this.reporting.set(true);

    this.spotService
      .report(Number(this.id()), choice)
      .pipe(finalize(() => this.reporting.set(false)))
      .subscribe({
        next: (result) => {
          this.liveMeter.set(result.liveMeter);
          this.nextReportAllowedAt.set(result.nextReportAllowedAt);
          this.clock.tick();
          this.toast.success('Merci ! Affluence mise à jour.');
        },
        error: (error: unknown) => {
          this.liveMeter.set(previousMeter); // rollback
          const nextAllowed = apiErrorBody(error)?.nextReportAllowedAt;
          if (nextAllowed) this.nextReportAllowedAt.set(nextAllowed);
          this.toast.error(
            apiErrorMessage(error, 'Votre signalement n’a pas pu être envoyé. Réessayez.'),
          );
        },
      });
  }

  protected postReview(review: NewReview): void {
    const id = Number(this.id());
    this.postingReview.set(true);
    this.spotService
      .createReview(id, review)
      .pipe(finalize(() => this.postingReview.set(false)))
      .subscribe({
        next: (created) => {
          this.reviews.update((list) => [created, ...(list ?? [])]);
          this.reviewFormOpen.set(false);
          this.toast.success('Merci pour votre avis !');
          // Refresh the averages ("Notes de la communauté") without showing the loading state.
          this.spotService.get(id).subscribe((spot) => this.spot.set(spot));
        },
        error: (error: unknown) =>
          this.toast.error(apiErrorMessage(error, 'Votre avis n’a pas pu être publié.')),
      });
  }

  /** Optimistic too: the heart fills immediately, and empties again if the server refuses. */
  protected toggleFavorite(): void {
    if (!this.auth.isLoggedIn()) {
      this.toast.info('Connectez-vous pour garder vos lieux favoris.');
      void this.router.navigate(['/connexion'], {
        queryParams: { redirect: `/lieux/${this.id()}` },
      });
      return;
    }
    const wasFavorite = this.isFavorite();
    this.isFavorite.set(!wasFavorite);
    const id = Number(this.id());
    const request$ = wasFavorite ? this.account.removeFavorite(id) : this.account.addFavorite(id);
    request$.subscribe({
      next: () => this.toast.success(wasFavorite ? 'Retiré des favoris.' : 'Ajouté aux favoris.'),
      error: (error: unknown) => {
        this.isFavorite.set(wasFavorite);
        this.toast.error(apiErrorMessage(error, 'Impossible de modifier vos favoris.'));
      },
    });
  }
}
