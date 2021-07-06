const BugBattle = window.BugBattle.default;

BugBattle.initialize(
  "J4ADFNfzzCdYWr8NBO4rozcb6NFeyyES",
  BugBattle.FEEDBACK_BUTTON
);

// Sample for feedback type options
BugBattle.setFeedbackTypeOptions([
  {
    title: "Support",
    description: "Get in touch with us.",
    icon: "https://jssdk.bugbattle.io/res/support.svg",
    action: () => {
      BugBattle.startBugReporting(BugBattle.FLOW_FEATUREREQUEST);
    },
  },
  {
    title: "Rate your experience",
    description: "Let us know how we could improve!",
    icon: "https://jssdk.bugbattle.io/res/star.svg",
    action: () => {
      BugBattle.startBugReporting(BugBattle.FLOW_RATING);
    },
  },
  {
    title: "Report an issue",
    description: "Something is broken? Let us know!",
    icon: "https://jssdk.bugbattle.io/res/bug.svg",
    action: () => {
      BugBattle.startBugReporting();
    },
  },
]);

BugBattle.enableNetworkLogger();

fetch("https://run.mocky.io/v3/002b4638-e1de-465c-9a7e-cd4216fd1389").then(
  (data) => {
    console.log(data);
    data.arrayBuffer().then((d) => {
      console.log(d);
    });
  }
);

// BugBattle.setApiUrl("http://localhost:9000");

BugBattle.setAppBuildNumber("2345");

BugBattle.enableReplays(true);

BugBattle.enablePoweredByBugbattle(true);

BugBattle.enableCrashDetector(true, false);

// Sets the app's build number.
BugBattle.setAppBuildNumber(5);

// Sets the app's version code.
BugBattle.setAppVersionCode("v5.0");

// Attaches custom data to the bug reports.
BugBattle.attachCustomData({
  test1: "Battle",
  data2: "Unicorn",
});

BugBattle.enableRageClickDetector(true);

// Disable shortcuts
BugBattle.enableShortcuts(true);

// Turn the privacy policy check on or off.
BugBattle.enablePrivacyPolicy(true);
BugBattle.setPrivacyPolicyUrl("htpp...");

console.warn("DEMO!");
console.log("HI!");

BugBattle.setCustomTranslation({
  de: {
    Feedback: "Feedback",
    "Click or drag to comment": "Klicken und ziehen Sie um Feedback zu melden",
    "Submit your feedback": "Feedback senden",
    "Your e-mail": "Ihre E-Mail Adresse",
    "E-mail": "E-Mail",
    "What went wrong?": "Was ist schief gelaufen?",
    "Describe your issue": "Beschreiben Sie den Fehler",
    "Send feedback": "Feedback senden",
    "How can we improve?": "Wie können wir uns verbessern?",
    "Thank you for your feedback!": "Vielen Dank für Ihr Feedback!",
    "Wrong API key": "BUGBATTLE: Bitte gib einen gültigen API Key ein!",
    "Please read and accept the privacy policy.":
      "Bitte lesen und akzeptieren Sie die Datenschutzerklärung.",
    "I read and accept the": "Ich akzeptiere die ",
    " privacy policy": "Datenschutzerklärung",
    Support: "Support",
    "Get in touch with us.": "Nimm Kontakt mit uns auf.",
    "Rate your experience": "Bewerte deine Erfahrung",
    "Let us know how we could improve!":
      "Lass uns wissen wie wir uns verbessern können.",
    "Report an issue": "Problem melden",
    "Something is broken? Let us know!":
      "Etwas funktioniert nicht? Lass es uns wissen!",
    "What feature would you like to see next?":
      "Welches Feature möchtest du als nächstes sehen?",
    "Request a feature": "Feature Request",
    "Problems detected": "Probleme erkannt",
    "We are always here to help, please let us know what happened.":
      "Wir sind immer für dich da, bitte teile uns mit was passiert ist.",
  },
  en: {
    Feedback: "Feedback",
    "Click or drag to comment": "Klicken und ziehen Sie um Feedback zu melden",
    "Submit your feedback": "Feedback senden",
    "Your e-mail": "Ihre E-Mail Adresse",
    "E-mail": "E-Mail",
    "What went wrong?": "Was ist schief gelaufen?",
    "Describe your issue": "Beschreiben Sie den Fehler",
    "Send feedback": "Feedback senden",
    "How can we improve?": "Wie können wir uns verbessern?",
    "Thank you for your feedback!": "Vielen Dank für Ihr Feedback!",
    "Wrong API key": "BUGBATTLE: Bitte gib einen gültigen API Key ein!",
    "Please read and accept the privacy policy.":
      "Bitte lesen und akzeptieren Sie die Datenschutzerklärung.",
    "I read and accept the": "Ich akzeptiere die ",
    " privacy policy": "Datenschutzerklärung",
    Support: "Support",
    "Get in touch with us.": "Nimm Kontakt mit uns auf.",
    "Rate your experience": "Bewerte deine Erfahrung",
    "Let us know how we could improve!":
      "Lass uns wissen wie wir uns verbessern können.",
    "Report an issue": "Problem melden",
    "Something is broken? Let us know!":
      "Etwas funktioniert nicht? Lass es uns wissen!",
    "What feature would you like to see next?":
      "Welches Feature möchtest du als nächstes sehen?",
    "Request a feature": "Feature Request",
    "Problems detected": "Probleme erkannt",
    "We are always here to help, please let us know what happened.":
      "Wir sind immer für dich da, bitte teile uns mit was passiert ist.",
  },
  fr: {
    Feedback: "Feedback",
    "Click or drag to comment":
      "Cliquer et glisser pour laisser votre feedback",
    "Submit your feedback": "Remarquez votre feedback",
    "Your e-mail": "Votre adresse email",
    "E-mail": "E-mail",
    "What went wrong?": "Qu'est-ce qui n'a pas fonctionné?",
    "Describe your issue": "Décrire le problème",
    "Send feedback": "Envoyer feedback",
    "How can we improve?": "Comment pouvons nous nous améliorer?",
    "Thank you for your feedback!": "Merci pour votre feedback!",
    "Wrong API key": "BUGBATTLE: Veuillez fournir un API key valide!",
    "Please read and accept the privacy policy.":
      "Lire et accepter la politique privacité.",
    "I read and accept the": "J'ai lu et j'accepte la ",
    " privacy policy": "politique de privacité",
    Support: "Soutien",
    "Get in touch with us.": "Contactez-nous.",
    "Rate your experience": "Évaluez votre expérience",
    "Let us know how we could improve!":
      "Dites-nous comment nous pourrions nous améliorer.",
    "Report an issue": "Signaler un problème",
    "Something is broken? Let us know!":
      "Quelque chose est cassé? Faites-le nous savoir!",
    "What feature would you like to see next?":
      "Quelle fonctionnalité aimeriez-vous voir ensuite?",
    "Request a feature": "Demander une fonctionnalité",
    "Problems detected": "Problèmes détectés",
    "We are always here to help, please let us know what happened.":
      "Nous sommes toujours là pour vous aider, veuillez nous faire savoir ce qui s'est passé.",
  },
  it: {
    Feedback: "Feedback",
    "Click or drag to comment":
      "Cliquer et glisser pour laisser votre feedback",
    "Submit your feedback": "Remarquez votre feedback",
    "Your e-mail": "Votre adresse email",
    "E-mail": "E-mail",
    "What went wrong?": "Qu'est-ce qui n'a pas fonctionné?",
    "Describe your issue": "Décrire le problème",
    "Send feedback": "Envoyer feedback",
    "How can we improve?": "Come possiamo migliorare?",
    "Thank you for your feedback!": "Merci pour votre feedback!",
    "Wrong API key": "BUGBATTLE: Veuillez fournir un API key valide!",
    "Please read and accept the privacy policy.":
      "Lire et accepter la politique privacité.",
    "I read and accept the": "J'ai lu et j'accepte la ",
    " privacy policy": "politique de privacité",
    Support: "Supporto",
    "Get in touch with us.": "Contattaci.",
    "Rate your experience": "Vota la tua esperienza",
    "Let us know how we could improve!":
      "Facci sapere come possiamo migliorare!",
    "Report an issue": "Segnala un problema",
    "Something is broken? Let us know!":
      "Qualcosa si è rotto? Fatecelo sapere!",
    "What feature would you like to see next?":
      "Quelle fonctionnalité aimeriez-vous voir ensuite ?",
    "Request a feature": "Richiedi una funzionalità",
    "Problems detected": "Problemi rilevati",
    "We are always here to help, please let us know what happened.":
      "Siamo sempre qui per aiutarti, facci sapere cosa è successo.",
  },
  nl: {
    Feedback: "Feedback",
    "Click or drag to comment": "Klik of sleep om commentaar toe te voegen",
    "Submit your feedback": "Verstuur terugkoppeling",
    "Your e-mail": "Je e-mailadres",
    "E-mail": "E-mailadres",
    "What went wrong?": "Wat gaat er mis?",
    "Describe your issue": "Omschrijf het probleem",
    "Send feedback": "Verstuur terugkoppeling",
    "How can we improve?": "Hoe kunnen we verbeteren?",
    "Thank you for your feedback!": "Dank voor de terugkoppeling",
    "Wrong API key": "BUGBATTLE: Voer een geldig API key in",
    "Please read and accept the privacy policy.":
      "Graag de privacy voorwaarden lezen en accorderen.",
    "I read and accept the": "Ik ga akkoord met de ",
    " privacy policy": "privacy voorwaarden",
    Support: "Support",
    "Get in touch with us.": "Neem contact met ons op.",
    "Rate your experience": "Beoordeel uw ervaring",
    "Let us know how we could improve!":
      "Laat ons weten hoe we kunnen verbeteren!",
    "Report an issue": "Meld een probleem",
    "Something is broken? Let us know!":
      "Is er iets kapot? Laat het ons weten!",
    "What feature would you like to see next?":
      "Welke functie zou je hierna willen zien?",
    "Request a feature": "Vraag een functie aan",
    "Problems detected": "Problemen gedetecteerd",
    "We are always here to help, please let us know what happened.":
      "We zijn altijd hier om te helpen, laat het ons weten wat er is gebeurd.",
  },
  cz: {
    Feedback: "Feedback",
    "Click or drag to comment": "Kliknutím nebo přetažením komentujete",
    "Submit your feedback": "Odeslat zpětnou vazbu",
    "Your e-mail": "Váš e-mail",
    "E-mail": "E-mail",
    "What went wrong?": "Co se stalo?",
    "Describe your issue": "Popište svůj problém",
    "Send feedback": "Odeslat zpětnou vazbu",
    "How can we improve?": "Jak se můžeme zlepšit?",
    "Thank you for your feedback!": "Děkujeme za zpětnou vazbu!",
    "Wrong API key": "BUGBATTLE: Uveďte platný klíč API!",
    "Please read and accept the privacy policy.":
      "Přečtěte si a přijměte zásady ochrany osobních údajů.",
    "I read and accept the": "Přečetl (a) jsem si ",
    " privacy policy": "zásady ochrany osobních údajů",
    Support: "Support",
    "Get in touch with us.": "Spojte se s námi.",
    "Rate your experience": "Ohodnoťte své zkušenosti",
    "Let us know how we could improve!":
      "Dejte nám vědět, jak bychom se mohli zlepšit!",
    "Report an issue": "Nahlásit problém",
    "Something is broken? Let us know!": "Něco je rozbité? Dejte nám vědět!",
    "What feature would you like to see next?":
      "Jakou funkci byste chtěli vidět dále?",
    "Request a feature": "Požádejte o funkci",
    "Problems detected": "Zjištěné problémy",
    "We are always here to help, please let us know what happened.":
      "Jsme tu vždy, abychom vám pomohli, dejte nám prosím vědět, co se stalo.",
  },
});

BugBattle.setLanguage("de");

var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function () {
  if (this.readyState == 4 && this.status == 200) {
    console.log(this.responseText);
  }
};
xhttp.open(
  "GET",
  "https://run.mocky.io/v3/274ec30c-eeba-4248-b605-ace31b7e3b52",
  true
);
xhttp.send();
