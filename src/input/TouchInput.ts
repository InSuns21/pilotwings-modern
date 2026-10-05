import type { FlightInput } from './FlightInput';

interface StickVector {
  readonly x: number;
  readonly y: number;
}

const STICK_DEAD_ZONE = 0.08;

export function normalizeTouchStick(
  originX: number,
  originY: number,
  pointerX: number,
  pointerY: number,
  radius: number
): StickVector {
  if (radius <= 0) {
    return { x: 0, y: 0 };
  }

  const rawX = (pointerX - originX) / radius;
  const rawY = (pointerY - originY) / radius;
  const length = Math.hypot(rawX, rawY);

  if (length <= STICK_DEAD_ZONE) {
    return { x: 0, y: 0 };
  }

  const scale = length > 1 ? 1 / length : 1;

  return {
    x: rawX * scale,
    y: rawY * scale
  };
}

export class TouchInput {
  readonly #stick: HTMLElement;
  readonly #knob: HTMLElement;
  readonly #thrust: HTMLElement;
  readonly #brake: HTMLElement;
  readonly #yawLeft: HTMLElement;
  readonly #yawRight: HTMLElement;
  readonly #cleanup: Array<() => void> = [];

  #stickPointerId: number | null = null;
  #stickVector: StickVector = { x: 0, y: 0 };
  readonly #thrustPointers = new Set<number>();
  readonly #brakePointers = new Set<number>();
  readonly #yawLeftPointers = new Set<number>();
  readonly #yawRightPointers = new Set<number>();

  constructor(private readonly root: HTMLElement) {
    this.#stick = this.#require('[data-touch-stick]');
    this.#knob = this.#require('[data-touch-knob]');
    this.#thrust = this.#require('[data-touch-thrust]');
    this.#brake = this.#require('[data-touch-brake]');
    this.#yawLeft = this.#require('[data-touch-yaw-left]');
    this.#yawRight = this.#require('[data-touch-yaw-right]');

    this.#listen(this.#stick, 'pointerdown', this.#onStickPointerDown);
    this.#listen(this.#stick, 'pointermove', this.#onStickPointerMove);
    this.#listen(this.#stick, 'pointerup', this.#onStickPointerEnd);
    this.#listen(this.#stick, 'pointercancel', this.#onStickPointerEnd);
    this.#listen(this.#stick, 'lostpointercapture', this.#onStickPointerEnd);

    this.#bindHoldButton(this.#thrust, this.#thrustPointers);
    this.#bindHoldButton(this.#brake, this.#brakePointers);
    this.#bindHoldButton(this.#yawLeft, this.#yawLeftPointers);
    this.#bindHoldButton(this.#yawRight, this.#yawRightPointers);
  }

  sample(): FlightInput {
    return {
      pitch: -this.#stickVector.y,
      roll: this.#stickVector.x,
      yaw:
        (this.#yawRightPointers.size > 0 ? 1 : 0) -
        (this.#yawLeftPointers.size > 0 ? 1 : 0),
      throttle: this.#thrustPointers.size > 0 ? 1 : 0,
      brake: this.#brakePointers.size > 0 ? 1 : 0
    };
  }

  dispose(): void {
    for (const cleanup of this.#cleanup.splice(0)) {
      cleanup();
    }
    this.#resetStick();
    this.#thrustPointers.clear();
    this.#brakePointers.clear();
    this.#yawLeftPointers.clear();
    this.#yawRightPointers.clear();
  }

  #require(selector: string): HTMLElement {
    const element = this.root.querySelector<HTMLElement>(selector);
    if (!element) {
      throw new Error(`Touch control element not found: ${selector}`);
    }
    return element;
  }

  #listen(
    element: HTMLElement,
    type: keyof HTMLElementEventMap,
    listener: (event: PointerEvent) => void
  ): void {
    const eventListener = listener as EventListener;
    element.addEventListener(type, eventListener);
    this.#cleanup.push(() => element.removeEventListener(type, eventListener));
  }

  #bindHoldButton(element: HTMLElement, pointers: Set<number>): void {
    const activate = (event: PointerEvent): void => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }
      event.preventDefault();
      pointers.add(event.pointerId);
      element.setPointerCapture(event.pointerId);
      element.dataset.active = 'true';
    };

    const deactivate = (event: PointerEvent): void => {
      pointers.delete(event.pointerId);
      if (pointers.size === 0) {
        delete element.dataset.active;
      }
    };

    this.#listen(element, 'pointerdown', activate);
    this.#listen(element, 'pointerup', deactivate);
    this.#listen(element, 'pointercancel', deactivate);
    this.#listen(element, 'lostpointercapture', deactivate);
  }

  #onStickPointerDown = (event: PointerEvent): void => {
    if (this.#stickPointerId !== null) {
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    this.#stickPointerId = event.pointerId;
    this.#stick.setPointerCapture(event.pointerId);
    this.#updateStick(event);
    this.#stick.dataset.active = 'true';
  };

  #onStickPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.#stickPointerId) {
      return;
    }
    event.preventDefault();
    this.#updateStick(event);
  };

  #onStickPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.#stickPointerId) {
      return;
    }
    this.#resetStick();
  };

  #updateStick(event: PointerEvent): void {
    const rect = this.#stick.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    const radius = Math.max(Math.min(rect.width, rect.height) / 2 - 18, 1);

    this.#stickVector = normalizeTouchStick(
      originX,
      originY,
      event.clientX,
      event.clientY,
      radius
    );

    this.#knob.style.transform = `translate(
      calc(-50% + ${this.#stickVector.x * radius}px),
      calc(-50% + ${this.#stickVector.y * radius}px)
    )`;
  }

  #resetStick(): void {
    this.#stickPointerId = null;
    this.#stickVector = { x: 0, y: 0 };
    this.#knob.style.transform = 'translate(-50%, -50%)';
    delete this.#stick.dataset.active;
  }
}
