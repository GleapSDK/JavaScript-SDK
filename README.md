# Gleap JavaScript and TypeScript SDK

![Gleap JavaScript SDK Intro](https://github.com/GleapSDK/JavaScript-SDK/blob/master/resources/banner.png?raw=true)

Add AI-native customer support, live chat, in-app bug reporting, a help center and surveys to websites and web apps using JavaScript or TypeScript with [Gleap](https://www.gleap.ai). Gleap is an Intercom alternative for software teams that connects customer conversations and feedback with product development.

[SDK documentation](https://docs.gleap.ai/documentation/javascript/README) · [Website](https://www.gleap.ai) · [Plans and pricing](https://www.gleap.ai/pricing)

## 📖 Docs & Examples

Checkout our [documentation](https://docs.gleap.ai/documentation/javascript/README) for full reference.

## 🚀 Getting started

1.) Create a Gleap account and project. See the [current plans and trial terms](https://www.gleap.ai/pricing).

2.) Include the Gleap JS SDK within your apps.

### Installation via npm

Install the **Gleap** package via npm or yarn.
```
npm install gleap --save
```

Import the **Gleap** package.
```
import Gleap from 'gleap';
```

**TypeScript projects:** the package types the `<gleap-*>` elements for both React 18 and React 19. This requires `@types/react` 18.2.6 or newer (17.0.51+ / 16.14.41+ on older React lines). If you see errors like `Type '"span"' is not assignable to type 'ElementType'` after installing, run `npm i -D @types/react@latest`.

### Initialize the SDK

Add the following code to initialize the Gleap JavaScript SDK. Replace "SDK-TOKEN" with your actual SDK token from the [Gleap dashboard](https://app.gleap.io).

```
Gleap.initialize("SDK-TOKEN");
```

### Data region (optional)

Projects hosted in the US data region select it before initializing. The default region is `eu`. See [docs/custom-widget-domains.md](docs/custom-widget-domains.md) for the host table and custom domains.

```
Gleap.setRegion("us");
Gleap.initialize("SDK-TOKEN");
```

### Dark mode (optional)

The widget can match your app's dark/light mode. Enable "Adapt to dark / light mode" in the dashboard (Widget → Look & feel) and set the dark colors there: header colors, UI color and background. In dark mode the widget uses these dark colors, plus the dark logo, header image and composer glow set in the dashboard; without dark colors it keeps its normal colors. Override the scheme at runtime, e.g. from your own theme toggle (only takes effect while "Adapt to dark / light mode" is enabled in the dashboard; until you call it, the dashboard setting applies):

```
Gleap.setColorScheme("auto"); // follows your app; or "light" / "dark" to force a mode
```

Congrats, you are now all set! Report your first bug by using the feedback button.

## 🤝 Need help?

We are here to help! hello@gleap.io
