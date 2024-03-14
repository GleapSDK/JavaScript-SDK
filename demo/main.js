const Gleap = window.Gleap;

Gleap.setLanguage("en");
Gleap.setFrameUrl("http://0.0.0.0:3001");
Gleap.setApiUrl("http://0.0.0.0:9000");
Gleap.setWSApiUrl("ws://0.0.0.0:8080");

Gleap.setAiTools([{
    name: 'send-money',
    description: 'Send money to a given contact.',
    response: 'The transfer got initiated but not completed yet. The user must confirm the transfer in the banking app.',
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
    if (tool.name === "send-money") {
        const amount = tool.params.amount;
        const contact = tool.params.contact;

        // Initiate the transfer here.
    }
});

Gleap.setTicketAttribute("notes", "This is a test value.");

Gleap.initialize("BXFtGQF5hRAJZqnyOAzSGH3NbEM4frFx");
