const Gleap = window.Gleap;

Gleap.initialize("a5yVbBAxZ3SxYRneqPnETvEG58veOyQs");

Gleap.identify("12938", {
  email: "lukas@gleap.io",
  name: "Lukas",
});

Gleap.attachCustomData({
  mission: "Unicorn",
  type: "Demo App",
  nestedData: {
    possible: true,
    name: "Mission: Impossible - Ghost Protocol",
  },
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
}, 3000);

setTimeout(() => {
  console.warn("Demo warning :)");
  console.log("Data will be loaded soon.");
}, 0);

setTimeout(() => {
  console.warn("Failed to attach button listener.");
}, 4000);