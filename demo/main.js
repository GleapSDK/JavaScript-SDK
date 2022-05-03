const Gleap = window.Gleap;

// Gleap.setApiUrl("http://localhost:9000");
Gleap.initialize("DUPaIr7s689BBblcFI4pc5aBgYJTm7Sc");

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

const files = [
  "https://biblephrasesm31p70v.blob.core.windows.net/phrases-v2/CD17C8A4CF4FA179C864FA4EFA561BBC405EF06304B1E239EE1A3A781A8905A0.mpga",
  "https://biblephrasesm31p70v.blob.core.windows.net/phrases-v2/CD17C8A4CF4FA179C864FA4EFA561BBC405EF06304B1E239EE1A3A781A8905A0.mpga",
  "https://reqres.in/api/products/3",
];

setTimeout(async () => {
  console.log("LOADING AUDIO:");
  for (let i = 0; i < files.length; i++) {
    let file = files[i];

    const response = await fetch(file);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer.byteLength) return;
    }
  }


  const a = await fetch("https://reqres.in/api/products/3");
  const j = await a.json();
  console.log(j);
}, 5000);

setTimeout(() => {
  const sheet1 = new CSSStyleSheet();
  sheet1.replaceSync("* { color: red; }");

  /*const div = document.createElement("div");
  const shadowRoot = div.attachShadow({ mode: "open" });
  shadowRoot.adoptedStyleSheets = [sheet1];
  shadowRoot.innerHTML = `
<span class="foo">Hello!<br />HelloHelloHelloHelloHelloHelloHelloHelloHello HelloHelloHelloHelloHelloHelloHelloHelloHello HelloHelloHelloHelloHelloHelloHelloHelloHello Hello</span>
`;
  document.body.appendChild(div);*/
  document.adoptedStyleSheets = [sheet1];
}, 2000);