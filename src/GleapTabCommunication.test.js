import {
  GleapNotificationManager,
  GleapSession,
  GleapFeedbackButtonManager,
  GleapAiChatbarManager,
} from './Gleap';
import GleapTabCommunication from './GleapTabCommunication';

// Keep the barrel import light (no DOM, no SDK_VERSION Webpack global): only the
// managers GleapTabCommunication actually reaches for.
jest.mock('./Gleap', () => ({
  GleapNotificationManager: { getInstance: jest.fn() },
  GleapSession: { getInstance: jest.fn() },
  GleapFeedbackButtonManager: { getInstance: jest.fn() },
  GleapAiChatbarManager: { getInstance: jest.fn() },
}));

// Minimal BroadcastChannel stand-in. Node's test env has no BroadcastChannel, so
// we model the same-origin fan-out ourselves: instances sharing a name deliver
// postMessage to each OTHER's onmessage (never to the sender), matching the spec.
class MockBroadcastChannel {
  static channels = {};

  constructor(name) {
    this.name = name;
    this.onmessage = null;
    this.closed = false;
    if (!MockBroadcastChannel.channels[name]) {
      MockBroadcastChannel.channels[name] = [];
    }
    MockBroadcastChannel.channels[name].push(this);
  }

  postMessage(data) {
    const peers = MockBroadcastChannel.channels[this.name] || [];
    peers.forEach((peer) => {
      if (peer !== this && !peer.closed && typeof peer.onmessage === 'function') {
        peer.onmessage({ data });
      }
    });
  }

  close() {
    this.closed = true;
    const peers = MockBroadcastChannel.channels[this.name] || [];
    MockBroadcastChannel.channels[this.name] = peers.filter((p) => p !== this);
  }

  static reset() {
    MockBroadcastChannel.channels = {};
  }
}

const SDK_KEY = 'test-sdk-key';
const CHANNEL_NAME = `gleap-tabs-${SDK_KEY}`;

let notifStub;
let buttonStub;
let sessionStub;
let chatbarStub;

beforeEach(() => {
  MockBroadcastChannel.reset();
  global.BroadcastChannel = MockBroadcastChannel;

  notifStub = { clearAllNotifications: jest.fn() };
  buttonStub = { updateNotificationBadge: jest.fn() };
  chatbarStub = { hideChatbarNotification: jest.fn() };
  sessionStub = { sdkKey: SDK_KEY, session: { gleapId: 'user-1' } };

  GleapNotificationManager.getInstance.mockReturnValue(notifStub);
  GleapFeedbackButtonManager.getInstance.mockReturnValue(buttonStub);
  GleapAiChatbarManager.getInstance.mockReturnValue(chatbarStub);
  GleapSession.getInstance.mockReturnValue(sessionStub);

  // Fresh singleton per test.
  GleapTabCommunication.instance = null;
});

afterEach(() => {
  delete global.BroadcastChannel;
});

// Simulates a sibling tab: a raw channel of the same name that we can send
// from / receive on independently of the singleton under test.
const openSiblingTab = () => new MockBroadcastChannel(CHANNEL_NAME);

describe('start()', () => {
  test('opens a channel named gleap-tabs-<sdkKey>', () => {
    const tc = GleapTabCommunication.getInstance();
    tc.start();
    expect(tc.channel).toBeTruthy();
    expect(tc.channel.name).toBe(CHANNEL_NAME);
  });

  test('is idempotent (does not replace an existing channel)', () => {
    const tc = GleapTabCommunication.getInstance();
    tc.start();
    const first = tc.channel;
    tc.start();
    expect(tc.channel).toBe(first);
  });

  test('no-ops when BroadcastChannel is unavailable', () => {
    delete global.BroadcastChannel;
    const tc = GleapTabCommunication.getInstance();
    tc.start();
    expect(tc.channel).toBeNull();
  });

  test('no-ops when the BroadcastChannel constructor throws (e.g. privacy mode)', () => {
    global.BroadcastChannel = function () {
      throw new Error('blocked');
    };
    const tc = GleapTabCommunication.getInstance();
    tc.start();
    expect(tc.channel).toBeNull();
  });
});

describe('sendMessage()', () => {
  test('reaches a sibling channel of the same name', () => {
    const tc = GleapTabCommunication.getInstance();
    tc.start();

    const sibling = openSiblingTab();
    const received = [];
    sibling.onmessage = (e) => received.push(e.data);

    const payload = { type: 'notifications-cleared', gleapId: 'user-1' };
    tc.sendMessage(payload);

    expect(received).toEqual([payload]);
  });

  test('no-ops (no throw) when called before start()', () => {
    const tc = GleapTabCommunication.getInstance();
    expect(() => tc.sendMessage({ type: 'notifications-cleared', gleapId: 'user-1' })).not.toThrow();
  });
});

describe('inbound notifications-cleared', () => {
  test('with matching gleapId clears notifications and hides the badge', () => {
    const tc = GleapTabCommunication.getInstance();
    tc.start();

    openSiblingTab().postMessage({ type: 'notifications-cleared', gleapId: 'user-1' });

    expect(notifStub.clearAllNotifications).toHaveBeenCalledWith(false, true);
    expect(buttonStub.updateNotificationBadge).toHaveBeenCalledWith(0);
  });

  test('applying the inbound clear does not post back on the channel (loop guard)', () => {
    const tc = GleapTabCommunication.getInstance();
    tc.start();
    const postSpy = jest.spyOn(tc.channel, 'postMessage');

    openSiblingTab().postMessage({ type: 'notifications-cleared', gleapId: 'user-1' });

    expect(postSpy).not.toHaveBeenCalled();
  });

  test('is ignored when the broadcast gleapId does not match the local user', () => {
    const tc = GleapTabCommunication.getInstance();
    tc.start();

    openSiblingTab().postMessage({ type: 'notifications-cleared', gleapId: 'someone-else' });

    expect(notifStub.clearAllNotifications).not.toHaveBeenCalled();
    expect(buttonStub.updateNotificationBadge).not.toHaveBeenCalled();
  });

  test('is ignored when the broadcast carries no gleapId', () => {
    const tc = GleapTabCommunication.getInstance();
    tc.start();

    openSiblingTab().postMessage({ type: 'notifications-cleared', gleapId: null });

    expect(notifStub.clearAllNotifications).not.toHaveBeenCalled();
  });

  test('is ignored when the local session has no gleapId', () => {
    sessionStub.session = { gleapId: null };
    const tc = GleapTabCommunication.getInstance();
    tc.start();

    openSiblingTab().postMessage({ type: 'notifications-cleared', gleapId: 'user-1' });

    expect(notifStub.clearAllNotifications).not.toHaveBeenCalled();
  });

  test('ignores unknown message types', () => {
    const tc = GleapTabCommunication.getInstance();
    tc.start();

    openSiblingTab().postMessage({ type: 'something-else', gleapId: 'user-1' });

    expect(notifStub.clearAllNotifications).not.toHaveBeenCalled();
  });

  test('does not dismiss the chatbar pill (that is a separate message type)', () => {
    const tc = GleapTabCommunication.getInstance();
    tc.start();

    openSiblingTab().postMessage({ type: 'notifications-cleared', gleapId: 'user-1' });

    expect(chatbarStub.hideChatbarNotification).not.toHaveBeenCalled();
  });
});

describe('inbound chatbar-notification-cleared', () => {
  test('with matching gleapId dismisses the chatbar pill (fromOtherTab = true)', () => {
    const tc = GleapTabCommunication.getInstance();
    tc.start();

    openSiblingTab().postMessage({ type: 'chatbar-notification-cleared', gleapId: 'user-1' });

    expect(chatbarStub.hideChatbarNotification).toHaveBeenCalledWith(true);
  });

  test('applying the inbound dismissal does not post back on the channel (loop guard)', () => {
    const tc = GleapTabCommunication.getInstance();
    tc.start();
    const postSpy = jest.spyOn(tc.channel, 'postMessage');

    openSiblingTab().postMessage({ type: 'chatbar-notification-cleared', gleapId: 'user-1' });

    expect(postSpy).not.toHaveBeenCalled();
  });

  test('is ignored when the broadcast gleapId does not match the local user', () => {
    const tc = GleapTabCommunication.getInstance();
    tc.start();

    openSiblingTab().postMessage({ type: 'chatbar-notification-cleared', gleapId: 'someone-else' });

    expect(chatbarStub.hideChatbarNotification).not.toHaveBeenCalled();
  });

  test('is ignored when the broadcast carries no gleapId', () => {
    const tc = GleapTabCommunication.getInstance();
    tc.start();

    openSiblingTab().postMessage({ type: 'chatbar-notification-cleared', gleapId: null });

    expect(chatbarStub.hideChatbarNotification).not.toHaveBeenCalled();
  });

  test('is ignored when the local session has no gleapId', () => {
    sessionStub.session = { gleapId: null };
    const tc = GleapTabCommunication.getInstance();
    tc.start();

    openSiblingTab().postMessage({ type: 'chatbar-notification-cleared', gleapId: 'user-1' });

    expect(chatbarStub.hideChatbarNotification).not.toHaveBeenCalled();
  });

  test('does not touch the widget bubble or badge (that is a separate message type)', () => {
    const tc = GleapTabCommunication.getInstance();
    tc.start();

    openSiblingTab().postMessage({ type: 'chatbar-notification-cleared', gleapId: 'user-1' });

    expect(notifStub.clearAllNotifications).not.toHaveBeenCalled();
    expect(buttonStub.updateNotificationBadge).not.toHaveBeenCalled();
  });
});

describe('stop()', () => {
  test('closes the channel and makes subsequent sendMessage a no-op', () => {
    const tc = GleapTabCommunication.getInstance();
    tc.start();

    const sibling = openSiblingTab();
    const received = [];
    sibling.onmessage = (e) => received.push(e.data);

    tc.stop();
    expect(tc.channel).toBeNull();

    tc.sendMessage({ type: 'notifications-cleared', gleapId: 'user-1' });
    expect(received).toEqual([]);
  });
});
