const Gleap = window.Gleap;

Gleap.setFrameUrl("http://0.0.0.0:3001");
Gleap.setApiUrl("http://0.0.0.0:9000");
Gleap.setWSApiUrl("ws://0.0.0.0:8080");

Gleap.initialize("ogWhNhuiZcGWrva5nlDS8l7a78OfaLlV");

/*Gleap.setUrlHandler((url, newTab) => {
  alert("URL: " + url + " newTab: " + newTab);
});*/

Gleap.registerCustomAction((customAction) => {
  console.log("Custom action: ", customAction);
});

Gleap.on("unread-count-changed", (unreadCount) => {
  console.log("Unread count changed: ", unreadCount);
});