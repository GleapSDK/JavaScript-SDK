const Gleap = window.Gleap;

Gleap.initialize("DUPaIr7s689BBblcFI4pc5aBgYJTm7Sc");

Gleap.identify("123338", {
  email: "lukas+test@gleap.io",
  name: "Lukas",
}, "232310140176f44725d35f8191b51bd8821f41dba9b4c3cfab409721feadb4fb");

Gleap.attachCustomData({
  mission: "Unicorn",
  type: "Demo App",
  nestedData: {
    possible: true,
    name: "Mission: Impossible - Ghost Protocol",
  },
});

Gleap.registerCustomAction((customAction) => {
  console.log("MAGIC??");
  console.log(customAction);
});

setTimeout(() => {
  console.log("Loading place infos");

  var xmlhttp = new XMLHttpRequest();
  var url = "https://jsonplaceholder.typicode.com/todos/1";

  xmlhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      var myArr = JSON.parse(this.responseText);
      console.log(myArr);
    }
  };
  xmlhttp.open("GET", url, true);
  xmlhttp.send();

  Gleap.preFillForm("bqfp3v", "DIES IST EIN TEST");
}, 1000);

setTimeout(() => {
  console.warn("Demo warning :)");
  console.log("Data will be loaded soon.");

  // xxx();
}, 4000);

const files = [
  "https://biblephrasesm31p70v.blob.core.windows.net/phrases-v2/CD17C8A4CF4FA179C864FA4EFA561BBC405EF06304B1E239EE1A3A781A8905A0.mpga",
  "https://biblephrasesm31p70v.blob.core.windows.net/phrases-v2/CD17C8A4CF4FA179C864FA4EFA561BBC405EF06304B1E239EE1A3A781A8905A0.mpga",
  "https://reqres.in/api/products/3",
];