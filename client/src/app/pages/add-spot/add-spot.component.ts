import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { LucideCircleExclamationPoint, LucideCopy, LucideLocateFixed, LucideMapPin, LucidePlus, LucideX } from '@lucide/angular';
import { finalize } from 'rxjs';
import { FORM_FIELD } from '../../components/form-field/form-field.component';
import { MapViewComponent } from '../../components/map-view/map-view.component';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import type { NewSpot, NoiseLevel, SpotType } from '../../models/spot.model';
import { SpotService } from '../../services/spot.service';
import { ToastService } from '../../services/toast.service';
import { apiErrorMessage, applyServerErrors } from '../../utils/api-error';
import { NOISE_LABELS } from '../../utils/filters';
import { PRICE_LABELS, SPOT_TYPE_LABELS, WEEK_ORDER, WEEKDAY_LABELS } from '../../utils/format';
import { fieldError } from '../../utils/form-errors';
import type { GeoPoint } from '../../utils/reference-point';

type SlotGroup = FormGroup<{ opensAt: FormControl<string>; closesAt: FormControl<string> }>;
type DayGroup = FormGroup<{ weekday: FormControl<number>; open: FormControl<boolean>; slots: FormArray<SlotGroup> }>;

/** A time slot must end after it starts ("09:00" < "18:00" works as text comparison). */
function slotOrderValidator(group: AbstractControl): ValidationErrors | null {
  const { opensAt, closesAt } = group.value as { opensAt: string; closesAt: string };
  return opensAt && closesAt && closesAt <= opensAt ? { slotOrder: true } : null;
}

function createSlot(opensAt = '08:00', closesAt = '20:00'): SlotGroup {
  return new FormGroup(
    {
      opensAt: new FormControl(opensAt, { nonNullable: true, validators: Validators.required }),
      closesAt: new FormControl(closesAt, { nonNullable: true, validators: Validators.required }),
    },
    { validators: slotOrderValidator },
  );
}

function createDay(weekday: number): DayGroup {
  return new FormGroup({
    weekday: new FormControl(weekday, { nonNullable: true }),
    open: new FormControl(weekday !== 0, { nonNullable: true }), // closed on Sunday by default
    slots: new FormArray([createSlot()]),
  });
}

/** Wi-Fi as a few understandable choices instead of a raw "Mb/s" number. */
const WIFI_OPTIONS = [
  { value: 0, label: 'Pas de Wi-Fi' },
  { value: 5, label: 'Lent (moins de 10 Mb/s)' },
  { value: 15, label: 'Correct (10 à 20 Mb/s)' },
  { value: 30, label: 'Rapide (20 à 50 Mb/s)' },
  { value: 100, label: 'Très rapide (plus de 50 Mb/s)' },
];

@Component({
  selector: 'app-add-spot',
  imports: [
    ReactiveFormsModule,
    MapViewComponent,
    FORM_FIELD,
    SpinnerComponent,
    LucideMapPin,
    LucideLocateFixed,
    LucidePlus,
    LucideX,
    LucideCopy,
    LucideCircleExclamationPoint,
  ],
  templateUrl: './add-spot.component.html',
  styleUrl: './add-spot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddSpotComponent {
  private readonly spotService = inject(SpotService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly map = viewChild(MapViewComponent);

  protected readonly typeOptions = Object.entries(SPOT_TYPE_LABELS) as [SpotType, string][];
  protected readonly noiseOptions = Object.entries(NOISE_LABELS) as [NoiseLevel, string][];
  protected readonly priceOptions = PRICE_LABELS.map((label, value) => ({ value, label }));
  protected readonly wifiOptions = WIFI_OPTIONS;
  protected readonly weekdayLabels = WEEKDAY_LABELS;
  protected readonly fieldError = fieldError;

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
    }),
    type: new FormControl<SpotType>('cafe', { nonNullable: true }),
    area: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(160)],
    }),
    description: new FormControl('', { nonNullable: true, validators: Validators.maxLength(500) }),
    position: new FormControl<GeoPoint | null>(null, Validators.required),
    equipment: new FormGroup({
      wifiSpeed: new FormControl(30, { nonNullable: true }),
      outletsCount: new FormControl(0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0), Validators.max(500)],
      }),
      noiseLevel: new FormControl<NoiseLevel>('modere', { nonNullable: true }),
      priceLevel: new FormControl(1, { nonNullable: true }),
      airConditioning: new FormControl(false, { nonNullable: true }),
    }),
    hours: new FormArray(WEEK_ORDER.map(createDay)),
  });

  protected readonly position = toSignal(this.form.controls.position.valueChanges, { initialValue: null });
  protected readonly submitting = signal(false);
  protected readonly showSummary = signal(false);
  protected readonly locating = signal(false);

  protected get days(): DayGroup[] {
    return this.form.controls.hours.controls;
  }

  // --- Map --------------------------------------------------------------------------------------
  protected setPosition(point: GeoPoint): void {
    this.form.controls.position.setValue(point);
    this.form.controls.position.markAsTouched();
  }

  /** Keyboard-friendly alternative to clicking: pan the map with the arrows, then press this. */
  protected placeAtMapCenter(): void {
    const center = this.map()?.getCenter();
    if (center) this.setPosition(center);
  }

  /** Opt-in geolocation: only asked when the user presses the button. */
  protected useMyLocation(): void {
    if (!('geolocation' in navigator)) {
      this.toast.error('Votre navigateur ne permet pas la géolocalisation.');
      return;
    }
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.locating.set(false);
        this.setPosition({ latitude: coords.latitude, longitude: coords.longitude });
      },
      () => {
        this.locating.set(false);
        this.toast.error('Position indisponible. Cliquez plutôt sur la carte.');
      },
      { timeout: 10_000 },
    );
  }

  // --- Opening hours (dynamic part of the form) ---------------------------------------------------
  protected addSlot(day: DayGroup): void {
    day.controls.slots.push(createSlot('14:00', '18:00'));
  }

  protected removeSlot(day: DayGroup, index: number): void {
    day.controls.slots.removeAt(index);
    if (day.controls.slots.length === 0) day.controls.open.setValue(false);
  }

  /** Re-opening a day that has no slot left gives it a default one. */
  protected toggleDay(day: DayGroup, event: Event): void {
    const open = (event.target as HTMLInputElement).checked;
    if (open && day.controls.slots.length === 0) day.controls.slots.push(createSlot());
  }

  /** "Copier les horaires du lundi sur tous les jours". */
  protected copyMondayToAll(): void {
    const monday = this.days[0]!;
    for (const day of this.days.slice(1)) {
      day.controls.open.setValue(monday.controls.open.value);
      day.controls.slots.clear();
      for (const slot of monday.controls.slots.getRawValue()) day.controls.slots.push(createSlot(slot.opensAt, slot.closesAt));
    }
    this.toast.info('Horaires du lundi copiés sur toute la semaine.');
  }

  protected slotError(slot: SlotGroup): string | null {
    if (!(slot.touched || slot.dirty)) return null;
    if (slot.hasError('slotOrder')) return 'La fermeture doit être après l’ouverture.';
    return slot.invalid ? 'Indiquez les deux heures.' : null;
  }

  // --- Submit ---------------------------------------------------------------------------------
  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.showSummary.set(true);
      // Move the focus to the first field to fix (keyboard and screen-reader friendly).
      queueMicrotask(() =>
        this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"], .ng-invalid input')?.focus(),
      );
      return;
    }
    if (this.submitting()) return;
    this.showSummary.set(false);
    this.submitting.set(true);

    this.spotService
      .create(this.toPayload())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (spot) => {
          this.toast.success('Merci ! Votre lieu est en ligne avec la mention « À vérifier ».');
          void this.router.navigate(['/lieux', spot.id]);
        },
        error: (error: unknown) => {
          applyServerErrors(this.form, error);
          this.toast.error(apiErrorMessage(error, 'Le lieu n’a pas pu être enregistré.'));
        },
      });
  }

  private toPayload(): NewSpot {
    const value = this.form.getRawValue();
    return {
      name: value.name.trim(),
      type: value.type,
      area: value.area.trim(),
      address: value.address.trim(),
      description: value.description.trim(),
      latitude: value.position!.latitude,
      longitude: value.position!.longitude,
      equipment: { ...value.equipment, outletsCount: Number(value.equipment.outletsCount) },
      openingHours: value.hours
        .filter((day) => day.open)
        .flatMap((day) => day.slots.map((slot) => ({ weekday: day.weekday, ...slot }))),
    };
  }
}
