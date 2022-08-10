const Gleap = window.Gleap;

//Gleap.setFrameUrl("http://localhost:3001");
// Gleap.setLanguage("en");
//Gleap.setApiUrl("http://localhost:9000");
Gleap.initialize("KProDXhMS0V3UUku2iNnrZ4XsBnAYzxt");

Gleap.identify("user_19283", {
  name: "Franz",
  email: "lukas@gleap.io",
  phone: "+436606210119",
  value: 199
});

Gleap.log("Test log");
Gleap.log("Test log info", "INFO");
Gleap.log("Test log warn", "WARNING");
Gleap.log("Test log err", "ERROR");

Gleap.on("open", () => {
  // Attach custom data.
  Gleap.attachCustomData({
    mission: "Unicorn",
    type: "Demo App",
    nestedData: {
      possible: true,
      name: "Mission: Impossible - Ghost Protocol",
    },
  });
});