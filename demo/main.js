const Gleap = window.Gleap;

//Gleap.setFrameUrl("http://0.0.0.0:3001");
//Gleap.setApiUrl("http://0.0.0.0:9000");
//Gleap.setWSApiUrl("ws://0.0.0.0:8080");

// Gleap.setLanguage("en");

Gleap.setReplayOptions({
  recordCanvas: true,
  sampling: {
    canvas: 15,
  },
  dataURLOptions: {
    type: 'image/webp',
    quality: 0.6,
  },
});

Gleap.initialize("U7alA97Vzu15arf4XFpPyxNOdNAv4u0H");

/*Gleap.setUrlHandler((url, newTab) => {
  alert("URL: " + url + " newTab: " + newTab);
});*/

Gleap.registerCustomAction((customAction) => {
  console.log("Custom action: ", customAction);
});