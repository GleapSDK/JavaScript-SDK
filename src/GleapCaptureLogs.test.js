/**
 * @jest-environment jsdom
 */

// Background log collection sends only what a bug report carries, only what the request asks for,
// and nothing when the app switched it off (Gleap.setRemoteLogCollectionEnabled(false)).

const mockFlowConfig = { enableWebReplays: true, capture: {} };
const mockReplay = { startDate: 1, events: [{ type: 4, data: { href: 'https://app.test' } }], packed: false, type: 'rrweb' };
const iso = (ms) => new Date(ms).toISOString();

jest.mock('./Gleap', () => ({
  __esModule: true,
  default: { openConversation: jest.fn(), open: jest.fn() },
  GleapConfigManager: {
    getInstance: () => ({ getFlowConfig: () => mockFlowConfig, onConfigLoaded: (callback) => callback() }),
  },
  GleapConsoleLogManager: {
    getInstance: () => ({
      getLogs: () => [
        { log: 'old', date: iso(1000), priority: 'INFO' },
        { log: 'during', date: iso(50000), priority: 'ERROR' },
      ],
    }),
  },
  GleapNetworkIntercepter: {
    getInstance: () => ({
      getRequests: () => [
        { url: 'https://app.test/a', date: iso(1000) },
        { url: 'https://app.test/b', date: iso(52000) },
      ],
    }),
  },
  GleapCustomDataManager: { getInstance: () => ({ getCustomData: () => ({ plan: 'pro' }) }) },
  GleapMetaDataManager: { getInstance: () => ({ getMetaData: () => ({ browser: 'Chrome' }), sessionStart: new Date(500) }) },
  GleapStreamedEvent: { getInstance: () => ({ getEventArray: () => [{ name: 'pageView', date: new Date(51000) }] }) },
  GleapReplayRecorder: { getInstance: () => ({ getReplaySnapshot: () => mockReplay, customOptions: {} }) },
  GleapSession: {
    getInstance: () => ({ session: { gleapId: 'g1' }, sdkKey: 'key', apiUrl: 'https://api.test', injectSession: () => {} }),
  },
  GleapFrameManager: {
    getInstance: () => ({ sendMessage: jest.fn(), setCaptureHidden: jest.fn(), setCaptureEditorOpen: jest.fn() }),
  },
  GleapTranslationManager: { getInstance: () => ({ isRTLLayout: false }) },
}));

import { buildLogsBundle, encodeLogsBundle, normalizeInclude } from './GleapCaptureApi';
import { unpack } from '@rrweb/packer';

describe('log bundle', () => {
  const allKeys = ['consoleLog', 'networkLogs', 'customData', 'metaData', 'customEventLog'];

  test('the bug report data, without a replay unless asked for', () => {
    const bundle = buildLogsBundle({ deviceId: 'web-1' });
    allKeys.forEach((key) => expect(bundle).toHaveProperty(key));
    expect(bundle.webReplay).toBeUndefined();
    expect(bundle).toEqual(expect.objectContaining({ platform: 'web', sdkType: 'JAVASCRIPT', deviceId: 'web-1' }));
    expect(bundle.windowStart).toBe(iso(500));
  });

  test('only what include asks for (absent keys = not collected)', () => {
    const bundle = buildLogsBundle({
      include: { consoleLog: true, networkLogs: false, customData: false, metaData: true, customEventLog: false },
    });
    expect(
      Object.keys(bundle)
        .filter((key) => allKeys.indexOf(key) !== -1)
        .sort()
    ).toEqual(['consoleLog', 'metaData']);
  });

  test('the replay only when asked for and web replays are on', () => {
    expect(buildLogsBundle({ include: { replays: true } }).webReplay).toEqual(mockReplay);
    mockFlowConfig.enableWebReplays = false;
    expect(buildLogsBundle({ include: { replays: true } }).webReplay).toBeUndefined();
    mockFlowConfig.enableWebReplays = true;
  });

  test('a recording window keeps the entries of the window (with a short lead-in)', () => {
    const bundle = buildLogsBundle({ windowStart: 50000, windowEnd: 60000 });
    expect(bundle.consoleLog.map((entry) => entry.log)).toEqual(['during']);
    expect(bundle.networkLogs.map((entry) => entry.url)).toEqual(['https://app.test/b']);
    expect(bundle.windowStart).toBe(iso(50000));
    expect(bundle.windowEnd).toBe(iso(60000));
  });

  test('encoded in slices to valid JSON: the replay packed, data that cannot be serialized left out', async () => {
    const bundle = buildLogsBundle({ include: { replays: true } });
    const cyclic = { plan: 'pro' };
    cyclic.self = cyclic;
    bundle.customData = cyclic;
    bundle.consoleLog = Array.from({ length: 120 }, (value, index) => ({ log: 'line ' + index }));

    const encoded = await encodeLogsBundle(bundle);
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(encoded.body);
    });
    const parsed = JSON.parse(text);

    expect(parsed.customData).toBeUndefined();
    expect(parsed.consoleLog).toHaveLength(120);
    expect(parsed.consoleLog[119]).toEqual({ log: 'line 119' });
    expect(parsed.webReplay.packed).toBe(true);
    expect(unpack(parsed.webReplay.events[0])).toEqual(expect.objectContaining(mockReplay.events[0]));
    expect(parsed).toEqual(expect.objectContaining({ platform: 'web', sdkType: 'JAVASCRIPT' }));
  });

  test('include defaults: everything but replays', () => {
    expect(normalizeInclude(undefined)).toEqual({
      consoleLog: true,
      networkLogs: true,
      customData: true,
      metaData: true,
      customEventLog: true,
      replays: false,
    });
    expect(normalizeInclude({ replays: true, consoleLog: 'yes' }).replays).toBe(true);
    expect(normalizeInclude({ consoleLog: 'yes' }).consoleLog).toBe(true);
  });
});

describe('log requests from the websocket', () => {
  let api;
  let manager;

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('./GleapCaptureApi', () => {
      const actual = jest.requireActual('./GleapCaptureApi');
      return {
        ...actual,
        claimCaptureRequest: jest.fn(() => Promise.resolve({ status: 200, data: { claimedElsewhere: false } })),
        postCaptureLogs: jest.fn(() => Promise.resolve({ status: 200, data: {} })),
        reportCaptureEvent: jest.fn(() => Promise.resolve({ status: 200, data: {} })),
      };
    });
    api = require('./GleapCaptureApi');
    const settings = require('./GleapCaptureSettings');
    settings.setRemoteLogCollectionEnabled(true);
    manager = new (require('./GleapCaptureManager').default)();
    mockFlowConfig.capture = {};
  });

  const request = (id, options) => ({ id, kind: 'logs', options: options || {}, expiresAt: iso(Date.now() + 60000) });

  test('claims, then posts the bundle once per request id', async () => {
    manager.handleServerRequest(request('cr-1', { include: { replays: false } }));
    manager.handleServerRequest(request('cr-1'));
    await flush();

    expect(api.claimCaptureRequest).toHaveBeenCalledTimes(1);
    expect(api.claimCaptureRequest.mock.calls[0][1]).toEqual(
      expect.objectContaining({ platform: 'web', sdkType: 'JAVASCRIPT' })
    );
    expect(api.postCaptureLogs).toHaveBeenCalledTimes(1);
    expect(api.postCaptureLogs.mock.calls[0][0]).toBe('cr-1');
    expect(api.reportCaptureEvent).not.toHaveBeenCalled();
  });

  test('switched off by the app: answered "unsupported", nothing collected', async () => {
    require('./GleapCaptureSettings').setRemoteLogCollectionEnabled(false);
    manager.handleServerRequest(request('cr-2'));
    await flush();

    expect(api.reportCaptureEvent).toHaveBeenCalledWith('cr-2', 'unsupported', 'disabled-by-app');
    expect(api.claimCaptureRequest).not.toHaveBeenCalled();
    expect(api.postCaptureLogs).not.toHaveBeenCalled();
  });

  test('switched off in the project: answered "unsupported", nothing collected', async () => {
    mockFlowConfig.capture = { backgroundLogs: false };
    manager.handleServerRequest(request('cr-3'));
    await flush();

    expect(api.reportCaptureEvent).toHaveBeenCalledWith('cr-3', 'unsupported', 'disabled-by-project');
    expect(api.postCaptureLogs).not.toHaveBeenCalled();
  });

  test('claimed by another tab or device a moment ago: that one answers', async () => {
    api.claimCaptureRequest.mockReturnValueOnce(Promise.resolve({ status: 200, data: { claimedElsewhere: true } }));
    manager.handleServerRequest(request('cr-4'));
    await flush();

    expect(api.postCaptureLogs).not.toHaveBeenCalled();
  });

  test('logs along with a screenshot or recording: none when the app switched log collection off', async () => {
    const settings = require('./GleapCaptureSettings');
    const session = { options: { attachLogs: true } };

    settings.setRemoteLogCollectionEnabled(false);
    expect(manager.attachesLogs(session)).toBe(false);
    manager.postLogs('cr-8', { consoleLog: [] });
    await flush();
    expect(api.postCaptureLogs).not.toHaveBeenCalled();

    settings.setRemoteLogCollectionEnabled(true);
    expect(manager.attachesLogs(session)).toBe(true);
    expect(manager.attachesLogs({ options: { attachLogs: false } })).toBe(false);
    manager.postLogs('cr-8', { consoleLog: [] });
    await flush();
    expect(api.postCaptureLogs).toHaveBeenCalledTimes(1);
  });

  test('ignores other kinds, expired requests and requests that are already final', async () => {
    manager.handleServerRequest({ id: 'cr-5', kind: 'screenshot' });
    manager.handleServerRequest({ id: 'cr-6', kind: 'logs', expiresAt: iso(Date.now() - 1000) });
    api.claimCaptureRequest.mockReturnValueOnce(Promise.resolve({ status: 410, data: null }));
    manager.handleServerRequest(request('cr-7'));
    await flush();

    expect(api.claimCaptureRequest).toHaveBeenCalledTimes(1);
    expect(api.postCaptureLogs).not.toHaveBeenCalled();
  });
});
