const Gleap = window.Gleap;

Gleap.setFrameUrl("http://0.0.0.0:3001");
Gleap.setApiUrl("http://0.0.0.0:9000");

Gleap.setDisablePageTracking(true);

Gleap.setLanguage("de");

Gleap.initialize("ogWhNhuiZcGWrva5nlDS8l7a78OfaLlV");

/*Gleap.setUrlHandler((url, newTab) => {
  alert("URL: " + url + " newTab: " + newTab);
});*/

Gleap.identify("12345", {
  name: "John Doe",
  email: "franzi@gleap.io"
});