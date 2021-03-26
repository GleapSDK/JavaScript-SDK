# Bugbattle JavaScript SDK

![Bugbattle JavaScript SDK Intro](https://github.com/BugBattle/JavaScript-SDK/blob/master/imgs/JavaScriptSDK.png)

The Bugbattle SDK for JavScript is the easiest way to integrate Bugbattle into your apps! Achieve better app quality & ratings with comprehensive in-app bug reporting. BugBattle offers affordable In-App Bug Reporting for Apps, WebApps & Websites.

## 📖 Docs & Examples

Checkout our [documentation](https://docs.bugbattle.io/docs/javascript-sdk) for full reference.

## ❤️ Demo

[https://jssdk.bugbattle.io/demo](https://jssdk.bugbattle.io/demo)

## ⭐️ Features

- Plain and instant setup
- Enhance your apps with bug reporting
- Easy integration
- Datacenter in europe
- Automatic crash detection
- Multiple platforms (iOS, Android, JavaScript)

## 🚀 Getting started

1.) Register an account at [www.bugbattle.io](https://www.bugbattle.io). It's free and takes just a few seconds.

2.) Include the BugBattle JS SDK within your apps.

### Installation via nom

Install the **bugbattle** package via npm or yarn.
```
npm install bugbattle --save
```

Import the **bugbattle** package.
```
import BugBattle from 'bugbattle';
```

### Manual installation

Add the following lines to your website's / webapp's ```<head>```-tag:
```
<link href="https://jssdk.bugbattle.io/latest/index.css" rel="stylesheet">
<script src="https://jssdk.bugbattle.io/latest/index.js"></script>
<script>let BugBattle = window.BugBattle.default;</script>
```

### Initialize the SDK

Add the following code to to initialize the BugBattle JavaScript SDK. Replace "YOUR-SDK-TOKEN-HERE" with your actual SDK token from the [Bugbattle dashboard](https://app.bugbattle.io).

```
BugBattle.initialize("YOUR-SDK-TOKEN-HERE", BugBattle.FEEDBACK_BUTTON);
```

Congrats, you are now all set! Report your first bug by using the feedback button.

## 🤤 Customization

You can track more data (i.e. the app build number, version code or custom data) by using one of the following functions.

```
// Sets the main color (color schema).
BugBattle.setMainColor("#086EFB");

// Sets the app's build number.
BugBattle.setAppBuildNumber(5);

// Sets the app's version code.
BugBattle.setAppVersionCode("v5.0");

// Attaches custom data to the bug reports.
BugBattle.attachCustomData({
    test1: 'Battle',
    data2: 'Unicorn',
});

// Enables the privacy policy check.
BugBattle.enablePrivacyPolicy(true);

// Sets the privacy policy.
BugBattle.setPrivacyPolicyUrl("https://someawesomesite...");

// Enables the automatic detection of crashes.
BugBattle.enableCrashDetector(true);
```

## 🤠 Activation methods

Currently you can choose between two activation methods, that initiate the bug reporting workflow.

a.) BugBattle.FEEDBACK_BUTTON - this will add a feedback bottom to the page
b.) BugBattle.NONE - this allows you to manually trigger the bug reporting workflow

If you want to manually trigger the bug reporting workflow, simply call the following method:

```
// Initiates the bug reporting workflow.
BugBattle.startBugReporting();
```

## 🤝 Need help?

We are here to help! hello@bugbattle.io