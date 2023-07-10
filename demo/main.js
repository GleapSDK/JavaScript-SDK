const Gleap = window.Gleap;

Gleap.setFrameUrl("http://0.0.0.0:3001");
Gleap.setApiUrl("http://0.0.0.0:9000");

Gleap.setLanguage("de");

Gleap.initialize("XNWIMPYahK8tJcJCp7RrqtoxZo1MMV7n");

/*Gleap.setUrlHandler((url, newTab) => {
  alert("URL: " + url + " newTab: " + newTab);
});*/

Gleap.identify("12345", {
  name: "John Doe",
  email: "lukas@gleap.io"
});