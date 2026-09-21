import { record } from '@rrweb/record';
import GleapReplayRecorder, { approximateSize } from './GleapReplayRecorder';

// The recorder only needs rrweb's emit callback; tests drive it directly.
jest.mock('@rrweb/record', () => ({ record: jest.fn() }));
jest.mock('@rrweb/packer', () => ({ pack: (event) => event }));
jest.mock('./GleapHelper', () => ({ isMobile: () => false }));

const MB = 1024 * 1024;
const META = 4;
const FULL_SNAPSHOT = 2;
const INCREMENTAL = 3;

let emit;

const meta = (href) => ({ type: META, data: { href, width: 1920, height: 1080 }, timestamp: 1 });
const fullSnapshot = (bytes) => ({
  type: FULL_SNAPSHOT,
  data: { node: { type: 0, childNodes: [{ type: 3, textContent: 'x'.repeat(bytes), id: 1 }], id: 0 } },
  timestamp: 1,
});
const mutation = (bytes) => ({
  type: INCREMENTAL,
  data: { source: 0, texts: [{ id: 1, value: 'x'.repeat(bytes) }], attributes: [], removes: [], adds: [] },
  timestamp: 1,
});
// What rrweb emits for the recording start (isCheckout false) and for every checkout.
const checkpoint = (href, snapshotBytes, isCheckout = true) => {
  emit(meta(href), isCheckout);
  emit(fullSnapshot(snapshotBytes), isCheckout);
};

const startRecorder = () => {
  const recorder = new GleapReplayRecorder();
  recorder.start();
  return recorder;
};
const bufferedHrefs = (recorder) =>
  recorder
    .getReplayData()
    .events.filter((event) => event.type === META)
    .map((event) => event.data.href);

beforeEach(() => {
  jest.useFakeTimers();
  record.mockReset().mockImplementation((options) => {
    emit = options.emit;
    return jest.fn();
  });
  record.takeFullSnapshot = jest.fn((isCheckout) => checkpoint('forced', MB, isCheckout));
  global.window = { location: { origin: 'https://app.example.com' }, innerWidth: 1920, innerHeight: 1080 };
});

afterEach(() => {
  jest.useRealTimers();
  delete global.window;
});

describe('replay buffer byte budget (#147738)', () => {
  test('checkpoints within the budget -> all three are kept', () => {
    const recorder = startRecorder();
    checkpoint('first', MB, false);
    emit(mutation(2 * MB));
    checkpoint('second', MB);
    emit(mutation(2 * MB));
    checkpoint('third', MB);
    emit(mutation(2 * MB));

    expect(bufferedHrefs(recorder)).toEqual(['first', 'second', 'third']);
    expect(record.takeFullSnapshot).not.toHaveBeenCalled();
  });

  test('buffer over the budget -> the oldest checkpoints are dropped, the replay still starts with a full snapshot', () => {
    const recorder = startRecorder();
    checkpoint('first', MB, false);
    emit(mutation(3 * MB));
    checkpoint('second', MB);
    emit(mutation(3 * MB));
    checkpoint('third', MB);
    emit(mutation(3 * MB));

    const { events } = recorder.getReplayData();
    expect(bufferedHrefs(recorder)).toEqual(['second', 'third']);
    expect(events[0].type).toBe(META);
    expect(events[1].type).toBe(FULL_SNAPSHOT);
  });

  test('a single checkpoint outgrows the budget -> a fresh checkpoint replaces it', () => {
    const recorder = startRecorder();
    checkpoint('first', MB, false);
    for (let i = 0; i < 4; i++) emit(mutation(3 * MB));
    expect(record.takeFullSnapshot).not.toHaveBeenCalled();

    jest.advanceTimersByTime(0);

    expect(record.takeFullSnapshot).toHaveBeenCalledTimes(1);
    expect(record.takeFullSnapshot).toHaveBeenCalledWith(true);
    expect(bufferedHrefs(recorder)).toEqual(['forced']);
    expect(recorder.getReplayData().events).toHaveLength(2);
  });

  test('the page outgrows the budget again right away -> the next fresh checkpoint waits 30 seconds', () => {
    startRecorder();
    checkpoint('first', MB, false);
    for (let i = 0; i < 4; i++) emit(mutation(3 * MB));
    jest.advanceTimersByTime(0);
    for (let i = 0; i < 4; i++) emit(mutation(3 * MB));

    jest.advanceTimersByTime(29 * 1000);
    expect(record.takeFullSnapshot).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    expect(record.takeFullSnapshot).toHaveBeenCalledTimes(2);
  });

  test('a full snapshot larger than the budget -> kept, and no checkpoint loop', () => {
    const recorder = startRecorder();
    checkpoint('first', 12 * MB, false);
    emit(mutation(MB));

    jest.advanceTimersByTime(10 * 60 * 1000);

    expect(record.takeFullSnapshot).not.toHaveBeenCalled();
    expect(bufferedHrefs(recorder)).toEqual(['first']);
  });

  test('stop() with a fresh checkpoint pending -> it is cancelled', () => {
    const recorder = startRecorder();
    checkpoint('first', MB, false);
    for (let i = 0; i < 4; i++) emit(mutation(3 * MB));

    recorder.stop();
    jest.advanceTimersByTime(60 * 1000);

    expect(record.takeFullSnapshot).not.toHaveBeenCalled();
  });
});

describe('approximateSize', () => {
  const added = (id) => ({
    parentId: 2,
    nextId: null,
    node: { type: 2, tagName: 'div', attributes: { class: 'row is-active', 'data-id': 'a1b2c3' }, childNodes: [], id },
  });

  test.each([
    [
      'a mutation adding 200 nodes',
      {
        type: INCREMENTAL,
        data: { source: 0, texts: [], attributes: [], removes: [], adds: Array.from({ length: 200 }, (_, i) => added(i)) },
        timestamp: 1790000000000,
      },
    ],
    [
      'a mouse move batch',
      {
        type: INCREMENTAL,
        data: {
          source: 1,
          positions: Array.from({ length: 50 }, (_, i) => ({ x: 100 + i, y: 200 + i, id: 12, timeOffset: -i * 10 })),
        },
        timestamp: 1790000000000,
      },
    ],
    [
      'a snapshot carrying an inlined stylesheet',
      {
        type: FULL_SNAPSHOT,
        data: {
          node: {
            type: 0,
            childNodes: [
              { type: 2, tagName: 'style', attributes: { _cssText: '.a{color:red}'.repeat(5000) }, childNodes: [], id: 1 },
            ],
            id: 0,
          },
        },
        timestamp: 1790000000000,
      },
    ],
  ])('%s -> within 25%% of its serialized size', (_label, event) => {
    const ratio = approximateSize(event) / JSON.stringify(event).length;
    expect(ratio).toBeGreaterThan(0.75);
    expect(ratio).toBeLessThan(1.25);
  });
});
