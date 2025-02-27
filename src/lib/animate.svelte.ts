type EasingFunction = (x: number) => number;

export const getAnimate = (easingFunction: EasingFunction) => {
  const stop = { value: false };
  return {
    // biome-ignore lint: void in an union, since this is a return type.
    animate: (start: number, end: number, duration: number, callback: (x: number) => boolean | void) => {
      const startTime = Date.now();
      const endTime = startTime + duration;
      const stepAnimation = () => {
        const now = Date.now();
        if (now > endTime || stop.value) {
          callback(end);
          return;
        }
        const progress = easingFunction((now - startTime) / duration);
        callback(start + (end - start) * progress);

        requestAnimationFrame(stepAnimation);
      };
      stepAnimation();
    },
    stop: () => {
      stop.value = true;
    },
  };
};

export class AnimatedState {
  #value = $state(0);
  #easingFunction: EasingFunction;
  #valueTarget = 0;

  constructor(
    initialValue: number,
    easingFunction: EasingFunction,
    public duration: number,
    public animationEnabled = true,
  ) {
    this.#value = initialValue;
    this.#valueTarget = initialValue;
    this.#easingFunction = easingFunction;
  }

  #stopPreviousAnimation: (() => void) | undefined = undefined;
  set value(v) {
    this.#valueTarget = v;

    if (!this.animationEnabled) {
      this.#value = v;
      return;
    }

    const { animate, stop } = getAnimate(this.#easingFunction);
    if (this.#stopPreviousAnimation) {
      this.#stopPreviousAnimation();
    }
    this.#stopPreviousAnimation = stop;
    animate(this.#value, v, this.duration, (x) => {
      this.#value = x;
    });
  }

  get valueTarget() {
    return this.#valueTarget;
  }

  get value() {
    return this.#value;
  }
}
