const Gleap = window.Gleap;

Gleap.setFrameUrl('http://localhost:3001');
Gleap.setApiUrl('http://localhost:9000');
Gleap.setWSApiUrl('ws://0.0.0.0:9000');

Gleap.initialize('GnhEkS8fdwxNVjyn3BnYwKzpCkiHgKWL');

Gleap.identify('218390129u9e1', {
  email: 'luca@gleap.io',
//   customData: {
//     user_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ1c2Vycy1zZXJ2aWNlIiwiaWF0IjoxNzgyMjk0NDA1LCJleHAiOjE3ODI4OTkyMDQsInVzZXJfaWQiOjE2NDMxNywidG9rZW4iOiJxVU5DaFJlb3VYNFNQbFpyVkNUWUpwQWFsMzhobVRZbVZ2VkhzU1Z3SENoR3duM09UMXd1aFpwYmNCWWNCQ3V1IiwidG9rZW5fZXhwaXJlZCI6IjIwMjYtMDctMDFUMDk6NDY6NDUuMDAwMDAwWiIsIm1vbm9saXRoX3VzZXJfaWQiOjEyNTg2NTEsIm9yZ2FuaXphdGlvbl9pZCI6bnVsbCwiaGFzX3BhbmVsX2FjY2VzcyI6ZmFsc2UsInYyIjp7InZlcmlmaWNhdGlvblR5cGUiOiJ1c2VyIiwidXNlcklkIjoiMTY0MzE3IiwiYWZmaWxpYXRlIjoiZnJ1IiwiZW1haWwiOiJpbnouYm9nZGFuLmN6YXBpZ2FAZ21haWwuY29tIiwicm9sZXMiOltdfX0.c8gV4-WlHc0RDrVvsRm8km0uvHybxQ4yYuP5en7iW1s',
//   },
});