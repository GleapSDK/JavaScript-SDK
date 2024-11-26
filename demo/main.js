const Gleap = window.Gleap;

Gleap.setFrameUrl("http://0.0.0.0:3001");
Gleap.setApiUrl("http://0.0.0.0:9000");
Gleap.setWSApiUrl("ws://0.0.0.0:9000");

Gleap.initialize("nKT6erqDUjwqfVN2xRkOG4XOf8NEEJ52");

Gleap.registerCustomAction((customAction) => {
  console.log(customAction);
});
