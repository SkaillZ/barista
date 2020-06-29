import {
  ViewEncapsulation,
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  Input,
  EventEmitter,
} from '@angular/core';
import { fromEvent, Observable, Subject, combineLatest } from 'rxjs';
import { map, takeUntil, pairwise, startWith } from 'rxjs/operators';

export class DtTimeChangeEvent {
  get value(): string {
    return `${valueTo2DigitString(this.hour)}:${valueTo2DigitString(
      this.minute,
    )}`;
  }
  constructor(public hour: number, public minute: number) {}
}

@Component({
  selector: 'dt-timeinput',
  templateUrl: 'timeinput.html',
  styleUrls: ['timeinput.scss'],
  host: {
    class: 'dt-timeinput',
  },
  encapsulation: ViewEncapsulation.Emulated,
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DtTimeinput implements AfterViewInit, OnDestroy {
  @Input() hour: number;
  @Input() minute: number;

  timeChanges = new EventEmitter<DtTimeChangeEvent>();

  @ViewChild('hours', { read: ElementRef }) hourInput: ElementRef<
    HTMLInputElement
  >;
  @ViewChild('minutes', { read: ElementRef }) minuteInput: ElementRef<
    HTMLInputElement
  >;

  private _destroy$ = new Subject<void>();

  ngAfterViewInit(): void {
    combineLatest(
      this._handleAndValidateNumberInput(
        this.hourInput.nativeElement,
        0,
        23,
        this.minuteInput.nativeElement,
      ),
      this._handleAndValidateNumberInput(this.minuteInput.nativeElement, 0, 59),
    )
      .pipe(takeUntil(this._destroy$))
      .subscribe(([[hourValue], [minuteValue]]) => {
        const event = new DtTimeChangeEvent(hourValue, minuteValue);
        console.log(event.value);
      });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  focus() {}

  // private _handleKeyup(nextToFocus?: HTMLInputElement): void {

  // }

  private _handleAndValidateNumberInput(
    element: HTMLInputElement,
    min: number,
    max: number,
    nextToFocus?: HTMLInputElement,
  ): Observable<[number, Event]> {
    return fromEvent(element, 'input').pipe(
      startWith(null), // We need a startWith here so pairwise also fires on the first event
      map((event) => {
        const value = element.value;
        const parsedValue = value.length ? parseInt(value, 10) : 0;

        // Side-effect: Autofocus the next input if we hit 2 digits
        if (nextToFocus && value.length >= 2) {
          nextToFocus.focus();
        }

        return [parsedValue, event];
      }),
      pairwise<[number, Event]>(),
      map(([prev, current]) => {
        const currentValue = current[0];
        const currentEvent = current[1];
        const prevValue = prev[0];
        if (currentValue < min || currentValue > max) {
          element.value = prevValue.toString();
          return [prevValue, currentEvent];
        }
        return current;
      }),
    );
  }
}

function valueTo2DigitString(value: number): string {
  return value < 10 ? `0${value}` : value.toString();
}
