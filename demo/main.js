const Gleap = window.Gleap;

Gleap.setFrameUrl("http://0.0.0.0:3001");
Gleap.setApiUrl("http://0.0.0.0:9000");
Gleap.setWSApiUrl("ws://0.0.0.0:9000");

Gleap.initialize("ogWhNhuiZcGWrva5nlDS8l7a78OfaLlV");

Gleap.registerCustomAction((customAction) => {
  console.log(customAction);
});

Gleap.setTicketAttribute("test", "test");

Gleap.unsetTicketAttribute("test");

Gleap.clearTicketAttributes();
