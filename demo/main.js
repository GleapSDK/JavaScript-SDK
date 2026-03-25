const Gleap = window.Gleap;

Gleap.setFrameUrl("http://0.0.0.0:3001");
Gleap.setApiUrl("http://0.0.0.0:9000");
Gleap.setWSApiUrl("ws://0.0.0.0:9000");

Gleap.initialize("GnhEkS8fdwxNVjyn3BnYwKzpCkiHgKWL");

Gleap.identify("123921943", {
  name: "Luca",
  email: "luca@gleap.io",
});

// Gleap.startAgent("69c0ec168f3b6a7e435ee8f5");

const userData = Gleap.getIdentity();

// If a userId exists the user is not a Guest
if (userData?.userId) {
  const gleapId = userData.gleapId;
  const gleapHash = userData.gleapHash;

  // Redirect back from url param redirect
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get('redirect');
  if (redirectUrl) {
    console.log("Redirecting to:", `${redirectUrl}?gleapId=${gleapId}&gleapHash=${gleapHash}`);
    window.location.href = `${redirectUrl}?gleapId=${gleapId}&gleapHash=${gleapHash}`;
  }
}

// Gleap.startChecklist("696e16f29debde04cb9c8c4d");

// Gleap.on("checklist-step-completed", (data) => {
//   console.log("Step completed:", data);
// });

// Gleap.on("checklist-completed", (data) => {
//   console.log("Checklist completed!", data);
// });

// Gleap.trackEvent("Connect payment completed");
// Gleap.trackEvent("Style business page completed");
// Gleap.trackEvent('step 2 completed');
