import Gleap from "./Gleap";

// Create a dummy no-op proxy for server environments.
const dummyFn = () => {};
const dummyHandler = {
  // Any property access will return a function that does nothing.
  get: () => dummyFn,
  // If the dummy is ever called as a function, return a no-op.
  apply: () => dummyFn(),
  // If someone tries to use "new" on it, return an empty object.
  construct: () => ({}),
};

const dummyGleap = new Proxy(dummyFn, dummyHandler);

// Export the real Gleap if window exists (i.e. in the browser),
// otherwise export the dummy version.
export default typeof window !== "undefined" ? Gleap : dummyGleap;
