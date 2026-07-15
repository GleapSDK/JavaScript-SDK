import { GleapSession, GleapTabCommunication } from './Gleap';
import GleapAiChatbarManager from './GleapAiChatbarManager';

// Keep the barrel + helper imports light (no DOM bootstrap, no SDK_VERSION global).
// The manager only reaches for GleapSession/GleapTabCommunication on the paths under
// test here; the other managers just need to exist so the module resolves.
jest.mock('./Gleap', () => ({
  GleapFrameManager: { getInstance: jest.fn(() => ({})) },
  GleapConfigManager: { getInstance: jest.fn(() => ({ getFlowConfig: () => ({}) })) },
  GleapSession: { getInstance: jest.fn() },
  GleapEventManager: { notifyEvent: jest.fn() },
  GleapTranslationManager: { getInstance: jest.fn(() => ({ getOverrideLanguage: () => null })) },
  GleapTabCommunication: { getInstance: jest.fn() },
}));

jest.mock('./GleapAgentToolManager', () => ({
  __esModule: true,
  default: { getInstance: jest.fn(() => ({ getAgentTools: () => [] })) },
}));

jest.mock('./GleapHelper', () => ({
  bootstrapGleapFrame: jest.fn(),
  runFunctionWhenDomIsReady: jest.fn(),
}));

let sendMessageMock;
let messageHandler; // the window 'message' listener registered by _listenForMessages

// A fake chatbar iframe whose contentWindow captures every posted message.
const attachReadyFrame = (manager) => {
  const contentWindow = { postMessage: jest.fn() };
  manager.chatbarFrame = { contentWindow };
  manager.comReady = true;
  return contentWindow;
};

const lastFramePayload = (contentWindow) => {
  const calls = contentWindow.postMessage.mock.calls;
  return JSON.parse(calls[calls.length - 1][0]);
};

beforeEach(() => {
  messageHandler = null;

  // Node's test env has no DOM. Stub just enough of window/document for the
  // constructor's _listenForMessages / _listenForOutsideClicks, capturing the
  // 'message' handler so we can simulate inbound frame messages.
  global.window = {
    addEventListener: jest.fn((type, handler) => {
      if (type === 'message') messageHandler = handler;
    }),
  };
  global.document = { addEventListener: jest.fn() };

  sendMessageMock = jest.fn();
  GleapTabCommunication.getInstance.mockReturnValue({ sendMessage: sendMessageMock });
  GleapSession.getInstance.mockReturnValue({ session: { gleapId: 'user-1' } });

  GleapAiChatbarManager.instance = null;
});

afterEach(() => {
  delete global.window;
  delete global.document;
});

describe('hideChatbarNotification()', () => {
  test('posts chatbar-notification-clear to the frame and broadcasts to sibling tabs', () => {
    const manager = GleapAiChatbarManager.getInstance();
    const frame = attachReadyFrame(manager);

    manager.hideChatbarNotification();

    expect(lastFramePayload(frame)).toEqual({ name: 'chatbar-notification-clear' });
    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'chatbar-notification-cleared',
      gleapId: 'user-1',
    });
  });

  test('fromOtherTab = true applies the dismissal but does NOT re-broadcast (loop guard)', () => {
    const manager = GleapAiChatbarManager.getInstance();
    const frame = attachReadyFrame(manager);

    manager.hideChatbarNotification(true);

    expect(lastFramePayload(frame)).toEqual({ name: 'chatbar-notification-clear' });
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  test('still broadcasts when the frame is not ready yet (clear is queued for the frame)', () => {
    const manager = GleapAiChatbarManager.getInstance();
    // comReady defaults to false and no frame is attached.

    manager.hideChatbarNotification();

    expect(manager.pendingMessages).toContainEqual({ name: 'chatbar-notification-clear' });
    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'chatbar-notification-cleared',
      gleapId: 'user-1',
    });
  });

  test('broadcast omits the gleapId when there is no identified session', () => {
    GleapSession.getInstance.mockReturnValue({ session: null });
    const manager = GleapAiChatbarManager.getInstance();
    attachReadyFrame(manager);

    manager.hideChatbarNotification();

    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'chatbar-notification-cleared',
      gleapId: undefined,
    });
  });
});

describe('inbound chatbar-notification-read (from the frame)', () => {
  test('broadcasts the dismissal so sibling tabs hide their pill', () => {
    const manager = GleapAiChatbarManager.getInstance();
    const frame = attachReadyFrame(manager);

    messageHandler({
      source: frame,
      data: JSON.stringify({ name: 'chatbar-notification-read' }),
    });

    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'chatbar-notification-cleared',
      gleapId: 'user-1',
    });
  });

  test('ignores messages that do not originate from the chatbar frame', () => {
    const manager = GleapAiChatbarManager.getInstance();
    attachReadyFrame(manager);

    messageHandler({
      source: { postMessage: jest.fn() }, // some other window
      data: JSON.stringify({ name: 'chatbar-notification-read' }),
    });

    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});

describe('showChatbarNotification() (unchanged counterpart)', () => {
  test('posts chatbar-notification to the frame', () => {
    const manager = GleapAiChatbarManager.getInstance();
    const frame = attachReadyFrame(manager);

    manager.showChatbarNotification({
      sender: { name: 'Kai' },
      text: 'Hey there',
      conversation: { shareToken: 'tok-1' },
    });

    expect(lastFramePayload(frame)).toEqual({
      name: 'chatbar-notification',
      data: { sender: 'Kai', text: 'Hey there', shareToken: 'tok-1' },
    });
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});
