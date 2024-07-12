const Gleap = window.Gleap;

Gleap.setLanguage("en");
Gleap.setFrameUrl("http://0.0.0.0:3001");
Gleap.setApiUrl("http://0.0.0.0:9000");
Gleap.setWSApiUrl("ws://0.0.0.0:9000");

Gleap.setAiTools([{
    name: 'send-money',
    description: 'Send money to a given contact.',
    executionType: 'button',
    parameters: [{
        name: 'amount',
        description: 'The amount of money to send. Must be positive and provided by the user.',
        type: 'number',
        required: true
    }, {
        name: 'contact',
        description: 'The contact to send money to.',
        type: 'string',
        enum: ["Alice", "Bob"],
        required: true
    }]
}]);

Gleap.on("tool-execution", (tool) => {
    console.log("Tool execution", JSON.stringify(tool, null, 2));
});

Gleap.setTicketAttribute("notes", "This is a test value.");

Gleap.initialize("xAhpa8UoNkm7Z5jaYexM0yKA6XAZs3yx");
