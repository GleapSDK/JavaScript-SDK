/**
 * @jest-environment jsdom
 */
import GleapMetaDataManager from './GleapMetaDataManager';

// Normally injected by Webpack's DefinePlugin.
global.SDK_VERSION = '0.0.0-test';

describe('GleapMetaDataManager env data controls', () => {
  beforeEach(() => {
    GleapMetaDataManager.instance = undefined;
  });

  test('collects the full env data by default', () => {
    const metaData = GleapMetaDataManager.getInstance().getMetaData();

    expect(metaData.currentUrl).toBe(window.location.href);
    expect(metaData.userAgent).toBe(navigator.userAgent);
    expect(metaData.sdkType).toBe('javascript');
    expect(metaData.environment).toBe('prod');
  });

  test('ignored props are removed and everything else is kept', () => {
    GleapMetaDataManager.setEnvDataPropsToIgnore(['currentUrl', 'userAgent']);

    const metaData = GleapMetaDataManager.getInstance().getMetaData();

    expect(metaData).not.toHaveProperty('currentUrl');
    expect(metaData).not.toHaveProperty('userAgent');
    expect(metaData.sdkType).toBe('javascript');
    expect(metaData.browser).toBeDefined();
  });

  test('each call replaces the previous list, and an empty or invalid list resets it', () => {
    GleapMetaDataManager.setEnvDataPropsToIgnore(['currentUrl']);
    GleapMetaDataManager.setEnvDataPropsToIgnore(['language']);

    let metaData = GleapMetaDataManager.getInstance().getMetaData();
    expect(metaData).toHaveProperty('currentUrl');
    expect(metaData).not.toHaveProperty('language');

    GleapMetaDataManager.setEnvDataPropsToIgnore([]);
    expect(GleapMetaDataManager.getInstance().getMetaData()).toHaveProperty('language');

    GleapMetaDataManager.setEnvDataPropsToIgnore(['language']);
    GleapMetaDataManager.setEnvDataPropsToIgnore(null);
    expect(GleapMetaDataManager.getInstance().getMetaData()).toHaveProperty('language');
  });

  test('disabled env data is not gathered at all', () => {
    const instance = GleapMetaDataManager.getInstance();
    const collect = jest.spyOn(instance, 'collectMetaData');

    GleapMetaDataManager.setDisableEnvData(true);

    expect(instance.getMetaData()).toEqual({});
    expect(collect).not.toHaveBeenCalled();
  });

  test('env data can be enabled again, keeping the ignored props', () => {
    GleapMetaDataManager.setEnvDataPropsToIgnore(['currentUrl']);
    GleapMetaDataManager.setDisableEnvData(true);
    GleapMetaDataManager.setDisableEnvData(false);

    const metaData = GleapMetaDataManager.getInstance().getMetaData();

    expect(metaData).not.toHaveProperty('currentUrl');
    expect(metaData.sdkType).toBe('javascript');
  });
});
