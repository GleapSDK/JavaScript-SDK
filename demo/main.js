const Gleap = window.Gleap;

// Gleap.setFrameUrl("http://localhost:3000");
// Gleap.setLanguage("en");
Gleap.setApiUrl("http://localhost:9000");
Gleap.initialize("KProDXhMS0V3UUku2iNnrZ4XsBnAYzxt");

Gleap.identify("user_19283", {
  name: "Franz Demoman",
  email: "lukas@gleap.io",
  phone: "+436606210119",
  value: 199
});

Gleap.attachCustomData({
  mission: "Unicorn",
  type: "Demo App",
  nestedData: {
    possible: true,
    name: "Mission: Impossible - Ghost Protocol",
  },
});

Gleap.log("Test log");
Gleap.log("Test log info", "INFO");
Gleap.log("Test log warn", "WARNING");
Gleap.log("Test log err", "ERROR");

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
}, 1000);