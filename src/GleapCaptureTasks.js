// Long work of capture requests (packing a replay, serializing a log bundle) in slices, so the
// page's main thread is never blocked for long.

// Work per slice before the page gets the thread back.
const SLICE_MS = 25;

export const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

/**
 * Resolves in a new task. A MessageChannel message is not throttled like timers are in background
 * tabs, where log requests usually arrive.
 * @returns {Promise<void>}
 */
export const yieldToPage = () =>
  new Promise((resolve) => {
    try {
      if (typeof MessageChannel === 'function') {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => {
          channel.port1.onmessage = null;
          try {
            channel.port1.close();
            channel.port2.close();
          } catch (exp) {}
          resolve();
        };
        channel.port2.postMessage(0);
        return;
      }
    } catch (exp) {}
    setTimeout(resolve, 0);
  });

/**
 * Calls work(item, index) for every item, yielding to the page between slices.
 * @param {Array} items
 * @param {function(*, number)} work
 * @param {function(): boolean} [isCancelled] stops early (rejects with 'cancelled')
 * @returns {Promise<void>}
 */
export const forEachSliced = (items, work, isCancelled) =>
  new Promise((resolve, reject) => {
    let index = 0;
    const step = () => {
      try {
        if (isCancelled && isCancelled()) {
          reject(new Error('cancelled'));
          return;
        }
        const start = now();
        while (index < items.length) {
          work(items[index], index);
          index += 1;
          if (now() - start > SLICE_MS && index < items.length) {
            yieldToPage().then(step);
            return;
          }
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    step();
  });

const stringifyValue = (value) => {
  const json = JSON.stringify(value);
  return json === undefined ? null : json;
};

// Arrays this long (or objects holding one) are serialized entry by entry.
const LARGE_ARRAY = 50;

const hasLargeArray = (value) =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).some((key) => Array.isArray(value[key]) && value[key].length > LARGE_ARRAY);

/**
 * The JSON text of a plain object as string parts (for a Blob, so no single huge string is built),
 * serialized in slices. A property that can't be serialized (custom data with cycles) is left out.
 * @returns {Promise<string[]>}
 */
export const toJsonParts = (value, isCancelled) => {
  const parts = ['{'];
  let first = true;
  const keys = Object.keys(value);
  const property = (key) => {
    const item = value[key];
    const prefix = (first ? '' : ',') + JSON.stringify(key) + ':';
    if (Array.isArray(item) && item.length > LARGE_ARRAY) {
      first = false;
      parts.push(prefix + '[');
      return forEachSliced(
        item,
        (entry, index) => {
          let json = null;
          try {
            json = stringifyValue(entry);
          } catch (exp) {}
          parts.push((index ? ',' : '') + (json || 'null'));
        },
        isCancelled
      ).then(() => {
        parts.push(']');
      });
    }
    if (hasLargeArray(item)) {
      first = false;
      parts.push(prefix);
      return toJsonParts(item, isCancelled).then((nested) => {
        nested.forEach((part) => parts.push(part));
      });
    }
    let json = null;
    try {
      json = stringifyValue(item);
    } catch (exp) {
      json = null;
    }
    if (json !== null) {
      first = false;
      parts.push(prefix + json);
    }
    return yieldToPage();
  };
  return keys
    .reduce((chain, key) => chain.then(() => property(key)), Promise.resolve())
    .then(() => {
      parts.push('}');
      return parts;
    });
};
