# Gleap JavaScript SDK

![Gleap JavaScript SDK Intro](https://github.com/Gleap/JavaScript-SDK/blob/master/imgs/JavaScriptSDK.png)

The Gleap SDK for JavScript is the easiest way to integrate Gleap into your apps! Achieve better app quality & ratings with comprehensive in-app bug reporting. Gleap offers affordable In-App Bug Reporting for Apps, WebApps & Websites.

## 📖 Docs & Examples

Checkout our [documentation](https://docs.gleap.io/docs/javascript-sdk) for full reference.

## ❤️ Demo

[https://jssdk.gleap.io/demo](https://jssdk.gleap.io/demo)

## ⭐️ Features

- Plain and instant setup
- Enhance your apps with bug reporting
- Easy integration
- Datacenter in europe
- Automatic crash detection
- Multiple platforms (iOS, Android, JavaScript)

## 🚀 Getting started

1.) Register an account at [www.gleap.io](https://www.gleap.io). It's free and takes just a few seconds.

2.) Include the Gleap JS SDK within your apps.

### Installation via nom

Install the **Gleap** package via npm or yarn.
```
npm install Gleap --save
```

Import the **Gleap** package.
```
import Gleap from 'Gleap';
```

### Manual installation

Add the following lines to your website's / webapp's ```<head>```-tag:
```
<script src="https://jssdk.gleap.io/latest/index.js"></script>
<script>let Gleap = window.Gleap.default;</script>
```

### Initialize the SDK

Add the following code to to initialize the Gleap JavaScript SDK. Replace "YOUR-SDK-TOKEN-HERE" with your actual SDK token from the [Gleap dashboard](https://app.gleap.io).

```
Gleap.initialize("YOUR-SDK-TOKEN-HERE", Gleap.FEEDBACK_BUTTON);
```

Congrats, you are now all set! Report your first bug by using the feedback button.

### Types of reports

- Bug report
- Feature request
- Rate your experience
- General feedback
- Contact support

## 🤝 Need help?

We are here to help! hello@gleap.io