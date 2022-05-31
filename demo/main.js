const Gleap = window.Gleap;

Gleap.setApiUrl("http://localhost:9000");
Gleap.initialize("ogWhNhuiZcGWrva5nlDS8l7a78OfaLlV");

Gleap.attachCustomData({
  mission: "Unicorn",
  type: "Demo App",
  nestedData: {
    possible: true,
    name: "Mission: Impossible - Ghost Protocol",
  },
});

// Register custom action.
Gleap.registerCustomAction((customAction) => {
  console.log("Custom action called:");
  console.log(customAction);
});

// Network logs test.
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