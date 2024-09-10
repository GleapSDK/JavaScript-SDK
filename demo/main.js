const Gleap = window.Gleap;

Gleap.setFrameUrl("http://0.0.0.0:3001");
Gleap.setApiUrl("http://0.0.0.0:9000");
Gleap.setWSApiUrl("ws://0.0.0.0:9000");

Gleap.initialize("ogWhNhuiZcGWrva5nlDS8l7a78OfaLlV");

const transactionTool = {
  // Name the tool. Only lowecase letters and - as well as _ are allowed.
  name: "send-money",
  // Describe the tool. This can also contain further instructions for the LLM.
  description: "Send money to a given contact.",
  // Let the LLM know what the tool is doing. This will allow Kai to update the customer accordingly.
  response:
    "The transfer got initiated but not completed yet. The user must confirm the transfer in the banking app.",
  // Set the execution type to auto or button.
  executionType: "auto",
  // Specify the parameters (it's also possible to pass an empty array)
  parameters: [
    {
      name: "amount",
      description:
        "The amount of money to send. Must be positive and provided by the user.",
      type: "number",
      required: true,
    },
    {
      name: "contact",
      description: "The contact to send money to.",
      type: "string",
      enum: ["Alice", "Bob"], // Optional
      required: true,
    },
  ],
};

Gleap.on("tool-execution", (tool) => {
  console.log(tool);
});

// Add all available tools to the array.
const tools = [transactionTool];

// Set the AI tools.
Gleap.setAiTools(tools);

Gleap.on("outbound-sent", (data) => {
  const { outboundId, outbound, formData } = data;
  console.log(data);
});
