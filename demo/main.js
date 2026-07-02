const Gleap = window.Gleap;

Gleap.setFrameUrl('http://0.0.0.0:3001');
Gleap.setApiUrl('http://0.0.0.0:9000');
Gleap.setWSApiUrl('ws://0.0.0.0:9000');

Gleap.initialize('GnhEkS8fdwxNVjyn3BnYwKzpCkiHgKWL');

// Gleap.showAiChatbar();
// Gleap.hideAiChatbar();

// setTimeout(() => {
//   Gleap.startBot("6908b32c145ee7d9aa226782");
// }, 1000);

Gleap.identify('535506', {
  email: 'luca@gleap.io',
});

setTimeout(() => {
  // Gleap.registerAgentTool('workflow-redirect', async ({ botID }) => {
  //   console.log('Workflow redirect', botID);
  //   // TODO: Implement your logic.

  //   // Return a string or JSON object — the AI waits for this response.
  //   return 'The action was completed successfully.';
  // });

  Gleap.registerAgentTool('send-money', async ({ amount }) => {
    // TODO: Implement your logic.
    console.log('Send money', amount);
  
    // Return a string or JSON — the AI waits for this response.
    return 'The action failed!';
  });

  Gleap.registerAgentTool('enable-dark-mode', async () => {
    // TODO: Implement your logic.
    console.log('Enable dark mode');
  
    // Return a string or JSON — the AI waits for this response.
    return 'The action was completed successfully.';
  });

  Gleap.startAgent('6a4637d818b4a930b509fbc4', {
    context: {
      userProjectId: '68ed10f4a2ec0e4c2ff4c812',
    },
    initialMessage: 'Let me know what workflow you want to create.',
  });
}, 2000);
