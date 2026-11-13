/**
 * Runs `callback` once the browser has an idle moment, at the latest after `timeout` ms, so work
 * the page does not need right away stays out of its load and first interactions.
 * Without requestIdleCallback (Safari) it runs right after the page's load event, again at the
 * latest after `timeout` ms.
 * @param {function} callback
 * @param {number} timeout
 * @returns {function} cancels the callback if it has not run yet
 */
export const runWhenIdle = (callback, timeout) => {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(callback, { timeout });
    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(handle);
      }
    };
  }

  let finished = false;
  let timer = null;
  const canListen = typeof window !== 'undefined' && typeof window.addEventListener === 'function';
  const cleanUp = () => {
    finished = true;
    clearTimeout(timer);
    if (canListen) {
      window.removeEventListener('load', onLoad);
    }
  };
  const run = () => {
    if (finished) {
      return;
    }
    cleanUp();
    callback();
  };
  const onLoad = () => {
    clearTimeout(timer);
    timer = setTimeout(run, 0);
  };

  const loaded = typeof document === 'undefined' || document.readyState === 'complete';
  if (loaded || !canListen) {
    timer = setTimeout(run, 0);
  } else {
    window.addEventListener('load', onLoad);
    timer = setTimeout(run, timeout);
  }
  return cleanUp;
};
