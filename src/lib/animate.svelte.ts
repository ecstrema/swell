type EasingFunction = (x: number) => number;

export const getAnimate = (easingFunction: EasingFunction) => {
  const stop = { value: false };
  return {
    animate: (
      start: number,
      end: number,
      duration: number,
      callback: (x: number) => boolean | void
    ) => {
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
  #animationTarget = 0;

  constructor(
    initialValue: number,
    easingFunction: EasingFunction,
    public duration: number,
    public animationEnabled = true
  ) {
    this.#value = initialValue;
    this.#easingFunction = easingFunction;
  }

  #stopPreviousAnimation: (() => void) | undefined = undefined;
  set value(v) {
    if (!this.animationEnabled) {
      this.#value = v;
      return;
    }

    this.#animationTarget = v;

    if (this.#stopPreviousAnimation) {
      this.#stopPreviousAnimation();
    }
    const { animate, stop } = getAnimate(this.#easingFunction);
    this.#stopPreviousAnimation = stop;
    animate(this.#value, v, this.duration, (x) => {
      this.#value = x;
    });
  }

  get animationTarget() {
    return this.#animationTarget;
  }

  get value() {
    return this.#value;
  }
}
