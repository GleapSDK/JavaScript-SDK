/**
 * @jest-environment jsdom
 */
import Gleap, { GleapSession } from './Gleap';

// initialize() names the key "Project ID"; the positional form keeps working.
describe('Gleap.initialize(projectId)', () => {
  let startSpy;
  let warnSpy;

  beforeEach(() => {
    Gleap.getInstance().initialized = false;
    GleapSession.instance = undefined;
    // startSession is an instance arrow property: stub it on the fresh singleton.
    startSpy = jest.spyOn(GleapSession.getInstance(), 'startSession').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    startSpy.mockRestore();
    warnSpy.mockRestore();
    Gleap.getInstance().initialized = false;
  });

  test('positional Project ID (the former SDK key) is used as before', () => {
    Gleap.initialize('PROJECT_ID_1');
    expect(GleapSession.getInstance().sdkKey).toBe('PROJECT_ID_1');
    expect(startSpy).toHaveBeenCalledTimes(1);
  });

  test('positional Project ID with options keeps sessionDuration', () => {
    Gleap.initialize('PROJECT_ID_2', { sessionDuration: 60000 });
    expect(GleapSession.getInstance().sdkKey).toBe('PROJECT_ID_2');
    expect(GleapSession.getInstance().sessionDuration).toBe(60000);
  });

  test('legacy boolean second argument is still accepted', () => {
    Gleap.initialize('PROJECT_ID_3', true);
    expect(GleapSession.getInstance().sdkKey).toBe('PROJECT_ID_3');
  });

  test('options object with projectId', () => {
    Gleap.initialize({ projectId: 'PROJECT_ID_4', sessionDuration: 120000 });
    expect(GleapSession.getInstance().sdkKey).toBe('PROJECT_ID_4');
    expect(GleapSession.getInstance().sessionDuration).toBe(120000);
  });

  test('projectId in the second argument when the first is empty', () => {
    Gleap.initialize(undefined, { projectId: 'PROJECT_ID_5' });
    expect(GleapSession.getInstance().sdkKey).toBe('PROJECT_ID_5');
  });
});
