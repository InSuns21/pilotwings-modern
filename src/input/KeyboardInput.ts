import type { FlightInput } from './FlightInput';

export class KeyboardInput {
  readonly #pressed = new Set<string>();
  #firePending = false;

  constructor(private readonly target: Window = window) {
    target.addEventListener('keydown', this.#onKeyDown);
    target.addEventListener('keyup', this.#onKeyUp);
    target.addEventListener('blur', this.#onBlur);
  }

  sample(): FlightInput {
    return {
      pitch: this.#axis('ArrowDown', 'ArrowUp'),
      roll: this.#axis('KeyA', 'KeyD'),
      yaw: this.#axis('KeyQ', 'KeyE'),
      throttle: this.#pressed.has('Space') ? 1 : 0,
      brake:
        this.#pressed.has('ShiftLeft') || this.#pressed.has('ShiftRight') ? 1 : 0
    };
  }

  consumeFire(): boolean {
    const fire = this.#firePending;
    this.#firePending = false;
    return fire;
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.#onKeyDown);
    this.target.removeEventListener('keyup', this.#onKeyUp);
    this.target.removeEventListener('blur', this.#onBlur);
    this.#pressed.clear();
    this.#firePending = false;
  }

  #axis(negativeKey: string, positiveKey: string): number {
    const negative = this.#pressed.has(negativeKey) ? 1 : 0;
    const positive = this.#pressed.has(positiveKey) ? 1 : 0;
    return positive - negative;
  }

  #onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'KeyF' && !this.#pressed.has('KeyF')) {
      this.#firePending = true;
    }
    this.#pressed.add(event.code);
    if (
      event.code === 'Space' ||
      event.code === 'ShiftLeft' ||
      event.code === 'ShiftRight' ||
      event.code.startsWith('Arrow')
    ) {
      event.preventDefault();
    }
  };

  #onKeyUp = (event: KeyboardEvent): void => {
    this.#pressed.delete(event.code);
  };

  #onBlur = (): void => {
    this.#pressed.clear();
    this.#firePending = false;
  };
}
