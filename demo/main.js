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

Gleap.identify('5355062', {
  email: 'luca@gleap.io',
  name: 'Tobias',
  company: { id: 'acme-inc', name: 'Acme Inc.' },
});
