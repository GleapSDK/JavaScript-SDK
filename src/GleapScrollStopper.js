export class GleapScrollStopper {
  keys = { 37: 1, 38: 1, 39: 1, 40: 1 };
  supportsPassive = false;
  wheelOpt = this.supportsPassive ? { passive: false } : false;
  wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';
  scrollDisabled = false;

  // GleapScrollStopper singleton
  static instance;
  static getInstance() {
    if (!this.instance) {
      this.instance = new GleapScrollStopper();
      return this.instance;
    } else {
      return this.instance;
    }
  }

  constructor() {
    const self = this;
    try {
      window.addEventListener(
        'test',
        null,
        Object.defineProperty({}, 'passive', {
          get: function () {
            self.supportsPassive = true;
            self.wheelOpt = self.supportsPassive ? { passive: false } : false;
          },
        })
      );
    } catch (e) {}
  }

  preventDefault(e) {
    e.preventDefault();
  }

  preventDefaultForScrollKeys(e) {
    if (this.keys && this.keys[e.keyCode]) {
      this.preventDefault(e);
      return false;
    }
  }

  static disableScroll() {
    const instance = this.getInstance();
    if (instance.scrollDisabled) {
      return;
    }

    instance.scrollDisabled = true;

    window.addEventListener('DOMMouseScroll', instance.preventDefault, false); // older FF
    window.addEventListener(instance.wheelEvent, instance.preventDefault, instance.wheelOpt); // modern desktop
    window.addEventListener('touchmove', instance.preventDefault, instance.wheelOpt); // mobile
    window.addEventListener('keydown', instance.preventDefaultForScrollKeys, false);
  }

  static enableScroll() {
    const instance = this.getInstance();
    if (!instance.scrollDisabled) {
      return;
    }

    instance.scrollDisabled = false;
    window.removeEventListener('DOMMouseScroll', instance.preventDefault, false);
    window.removeEventListener(instance.wheelEvent, instance.preventDefault, instance.wheelOpt);
    window.removeEventListener('touchmove', instance.preventDefault, instance.wheelOpt);
    window.removeEventListener('keydown', instance.preventDefaultForScrollKeys, false);
  }
}
