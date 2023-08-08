const Gleap = window.Gleap;

//Gleap.setFrameUrl("http://0.0.0.0:3001");
//Gleap.setApiUrl("http://0.0.0.0:9000");

Gleap.setDisablePageTracking(true);

Gleap.setLanguage("de");

Gleap.initialize("hciNpT8z64tsHATINYZjWBvbirVWCKWt");

/*Gleap.setUrlHandler((url, newTab) => {
  alert("URL: " + url + " newTab: " + newTab);
});*/

Gleap.identify("613b5dc530aed737108f87a8", {
  name: "Lukas",
  email: "lukas@gleap.io"
});