const Gleap = window.Gleap;

Gleap.setFrameUrl("http://0.0.0.0:3001");
Gleap.setApiUrl("http://0.0.0.0:9000");
Gleap.setWSApiUrl("ws://0.0.0.0:9000");

//Gleap.disableQueryParams(true);

Gleap.initialize("ogWhNhuiZcGWrva5nlDS8l7a78OfaLlV");

Gleap.on("tool-execution", (tool) => {
    console.log(tool);
});