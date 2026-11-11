import GleapFeedback from './GleapFeedback';
import { startScreenCapture } from './ScreenCapture';
import { GleapScreenRecorder } from './GleapScreenRecorder';

const WEB_REPLAY = { startDate: 1, events: ['packed-event'], packed: true, type: 'rrweb' };
const REPLAY_OPTIONS = { maskAllInputs: true };

// sendFeedback only reads from the sibling managers; stub the barrel so it loads
// without a DOM or the SDK_VERSION Webpack global.
// The SDK's global data; tests add to it (reset in beforeEach).
const mockGlobalData = {};

jest.mock('./Gleap', () => {
  const manager = (methods) => ({ getInstance: jest.fn(() => methods) });
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => ({
        getGlobalDataItem: (key) => mockGlobalData[key] ?? null,
        setGlobalDataItem: (key, value) => {
          mockGlobalData[key] = value;
        },
        isLiveMode: () => false,
      })),
    },
    GleapConsoleLogManager: manager({ getLogs: () => [{ log: 'hello' }] }),
    GleapStreamedEvent: manager({ getEventArray: () => [] }),
    GleapSession: manager({ apiUrl: 'https://api.gleap.io', injectSession: jest.fn() }),
    GleapCustomDataManager: manager({ getCustomData: () => ({}), getTicketAttributes: () => ({}) }),
    GleapMetaDataManager: manager({ getMetaData: () => ({}) }),
    GleapNetworkIntercepter: manager({ getRequests: () => [{ url: 'https://app.example.com/api' }] }),
    GleapReplayRecorder: manager({ customOptions: { maskAllInputs: true } }),
    GleapTagManager: manager({ getTags: () => [] }),
  };
});

jest.mock('./ScreenCapture', () => ({
  startScreenCapture: jest.fn(() => Promise.resolve({ html: '<html></html>' })),
}));

jest.mock('./GleapScreenRecorder', () => ({ GleapScreenRecorder: { uploadFile: jest.fn() } }));

// Minimal XHR double: tests drive responses explicitly via respond().
class MockXhr {
  static instances = [];

  constructor() {
    MockXhr.instances.push(this);
  }

  open(method, url) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader() {}

  send(body) {
    this.body = JSON.parse(body);
  }

  respond(status, responseText) {
    this.status = status;
    this.responseText = responseText || '';
    this.readyState = 4;
    this.onreadystatechange();
  }
}

// takeSnapshot resolves through a few promise hops before the request goes out.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const send = async ({ isSilent = false, excludeData = {} } = {}) => {
  const result = new GleapFeedback(
    'BUG',
    'MEDIUM',
    { description: 'It broke' },
    isSilent,
    excludeData,
    undefined,
    undefined
  ).sendFeedback();
  const settled = jest.fn();
  result.then(
    (value) => settled('resolved', value),
    () => settled('rejected')
  );
  await flush();
  return settled;
};

beforeEach(() => {
  MockXhr.instances = [];
  global.XMLHttpRequest = MockXhr;
  Object.keys(mockGlobalData).forEach((key) => delete mockGlobalData[key]);
  Object.assign(mockGlobalData, { webReplay: WEB_REPLAY, snapshotPosition: { x: 0, y: 0 } });
  startScreenCapture.mockClear();
  GleapScreenRecorder.uploadFile.mockReset();
});

describe('sendFeedback when the report is too large (#147738)', () => {
  test('201 -> one request carrying every attachment', async () => {
    const settled = await send();
    MockXhr.instances[0].respond(201, '{"id":"ticket-1"}');
    await flush();

    expect(MockXhr.instances).toHaveLength(1);
    expect(MockXhr.instances[0].url).toBe('https://api.gleap.io/bugs/v2');
    expect(MockXhr.instances[0].body.webReplay).toEqual(WEB_REPLAY);
    expect(settled).toHaveBeenCalledWith('resolved', { id: 'ticket-1' });
  });

  test('413 -> resent without the replay, and the report arrives', async () => {
    const settled = await send();
    MockXhr.instances[0].respond(413);
    await flush();

    expect(MockXhr.instances).toHaveLength(2);
    expect(MockXhr.instances[1].body.webReplay).toBeUndefined();
    expect(MockXhr.instances[1].body.screenshotData).toEqual({ html: '<html></html>', x: 0, y: 0 });
    expect(MockXhr.instances[1].body.formData).toEqual({ description: 'It broke' });

    MockXhr.instances[1].respond(201, '{"id":"ticket-1"}');
    await flush();
    expect(settled).toHaveBeenCalledWith('resolved', { id: 'ticket-1' });
  });

  test('413 again -> resent without screenshot data and network logs too', async () => {
    await send();
    MockXhr.instances[0].respond(413);
    MockXhr.instances[1].respond(413);

    expect(MockXhr.instances).toHaveLength(3);
    expect(MockXhr.instances[2].body.screenshotData).toBeUndefined();
    expect(MockXhr.instances[2].body.networkLogs).toBeUndefined();
    expect(MockXhr.instances[2].body.consoleLog).toEqual([{ log: 'hello' }]);
    expect(MockXhr.instances[2].body.formData).toEqual({ description: 'It broke' });
  });

  test('413 with nothing left to drop -> rejected', async () => {
    const settled = await send();
    MockXhr.instances[0].respond(413);
    MockXhr.instances[1].respond(413);
    MockXhr.instances[2].respond(413);
    await flush();

    expect(MockXhr.instances).toHaveLength(3);
    expect(settled).toHaveBeenCalledWith('rejected');
  });

  test('any other failure -> rejected without a retry', async () => {
    const settled = await send();
    MockXhr.instances[0].respond(500);
    await flush();

    expect(MockXhr.instances).toHaveLength(1);
    expect(settled).toHaveBeenCalledWith('rejected');
  });
});

describe('screenshot capture', () => {
  test('gets the replay options, so form fields are masked the same way as in replays', async () => {
    await send();

    expect(startScreenCapture).toHaveBeenCalledWith(false, REPLAY_OPTIONS);
  });
});

// The form's marked screenshot, taken from the tab on "Next" (GleapMarkerManager), #228450.
describe('tab screenshot of the feedback form', () => {
  // A 1x1 JPEG header is enough: only the bytes and the type are passed on.
  const IMAGE = { dataUrl: 'data:image/jpeg;base64,/9j/4AAQ', width: 1, height: 1, method: 'tab' };

  test('goes out as an uploaded image instead of the DOM, and is not sent twice', async () => {
    mockGlobalData.screenshotImage = IMAGE;
    GleapScreenRecorder.uploadFile.mockResolvedValue('https://files.gleap.io/screenshot.jpg');

    await send();
    const file = GleapScreenRecorder.uploadFile.mock.calls[0][0];
    expect(file.name).toBe('screenshot.jpg');
    expect(file.type).toBe('image/jpeg');
    expect(file.size).toBe(6);
    expect(MockXhr.instances[0].body.screenshotUrl).toBe('https://files.gleap.io/screenshot.jpg');
    expect(MockXhr.instances[0].body.screenshotData).toBeUndefined();
    expect(startScreenCapture).not.toHaveBeenCalled();

    MockXhr.instances[0].respond(201, '{"id":"ticket-1"}');
    expect(mockGlobalData.screenshotImage).toBeNull();
  });

  test('a failed upload falls back to the DOM render', async () => {
    mockGlobalData.screenshotImage = IMAGE;
    GleapScreenRecorder.uploadFile.mockRejectedValue(new Error('Upload failed with status 500'));

    await send();

    expect(MockXhr.instances[0].body.screenshotUrl).toBeUndefined();
    expect(MockXhr.instances[0].body.screenshotData).toEqual({ html: '<html></html>', x: 0, y: 0 });
  });

  test('no tab screenshot (not offered, declined, or not marked) -> the DOM render', async () => {
    await send();

    expect(GleapScreenRecorder.uploadFile).not.toHaveBeenCalled();
    expect(MockXhr.instances[0].body.screenshotData).toEqual({ html: '<html></html>', x: 0, y: 0 });
  });

  test('a silent report never takes the form screenshot along', async () => {
    mockGlobalData.screenshotImage = IMAGE;

    await send({ isSilent: true });

    expect(GleapScreenRecorder.uploadFile).not.toHaveBeenCalled();
    expect(MockXhr.instances[0].body.screenshotUrl).toBeUndefined();
    expect(mockGlobalData.screenshotImage).toBe(IMAGE);
  });

  test('a form that excludes screenshots sends none', async () => {
    mockGlobalData.screenshotImage = IMAGE;

    await send({ excludeData: { screenshot: true } });

    expect(GleapScreenRecorder.uploadFile).not.toHaveBeenCalled();
    expect(MockXhr.instances[0].body.screenshotUrl).toBeUndefined();
    expect(MockXhr.instances[0].body.screenshotData).toBeUndefined();
  });
});
