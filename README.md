## BugBattle JavaScript SDK
Achieve better app quality & ratings with comprehensive in-app bug reporting. BugBattle offers affordable In-App Bug Reporting for Apps, WebApps & Websites.

## ❤️ Demo

[https://jssdk.bugbattle.io/demo](https://jssdk.bugbattle.io/demo)

## ⭐️ Features

- Plain and instant setup
- Enhance your apps with bug reporting
- Easy integration
- Datacenter in europe
- Multiple platforms (iOS, Android, JavaScript)

## 🚀 Getting started

1.) Register an account at [www.bugbattle.io](https://www.bugbattle.io). It's free and takes just a few seconds.

2.) Include the BugBattle JS SDK within your apps.

NPM / YARN:
```
npm install bugbattle --save
```

OR add the following lines to your website's / webapp's head-tag:
```
<link href="https://jssdk.bugbattle.io/v1.0.3/index.css" rel="stylesheet">
<script src="https://jssdk.bugbattle.io/v1.0.3/index.js"></script>
<script>let BugBattle = window.BugBattle.default;</script>
```

3.) Initialize the SDK

Add the following code to your app / website to initialize the BugBattle JavaScript SDK. Replace "YOUR-SDK-TOKEN-HERE" with your actual sdk token.

```
<script>
let bugBattle = new BugBattle("YOUR-SDK-TOKEN-HERE", BugBattle.FEEDBACK_BUTTON);
</script>
```

Congrats, you are now all set! Report your first bug by using the feedback button.

## 🤤 Customization / tracking more data

You can track more data (i.e. the app build number, version code or custom data) by using one of the following functions.

```
// Set's the main color (color schema).
bugBattle.setMainColor("#086EFB");

// Set's the app's build number.
bugBattle.setAppBuildNumber(5);

// Set's the app's version code.
bugBattle.setAppVersionCode("v5.0");

// Attaches custom data to the bug reports.
bugBattle.setCustomData({
    test1: "Battle",
    data2: "Unicorn"
});
```

## 🤠 Activation methods

Currently you can choose between two activation methods, that initiate the bug reporting workflow.

a.) BugBattle.FEEDBACK_BUTTON - this will add a feedback bottom to the page
b.) BugBattle.NONE - this allows you to manually trigger the bug reporting workflow

If you want to manually trigger the bug reporting workflow, simply call the following method:

```
// Initiates the bug reporting workflow.
bugBattle.reportBug();
```

## 🤝 Need help?

We are here to help! hi@bugbattle.io