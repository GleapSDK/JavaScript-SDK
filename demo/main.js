const Gleap = window.Gleap;

Gleap.initialize("wytzEhhSa1EFfTEqK3HXBWuGRt2PREAE");

/*

Gleap.identify("613b5dc530aed737108f87a8", {
  email: "lukas@gleap.io",
  name: "Lukas",
});

Gleap.logEvent("signedUp");

Gleap.logEvent("purchased", {
  name: "Blue tomatos",
});
*/

setTimeout(() => {
  var request = new XMLHttpRequest();

  request.open(
    "POST",
    "https://wiki.selfhtml.org/wiki/JavaScript/XMLHttpRequest"
  );
  request.setRequestHeader("X-Test", "test1");
  request.setRequestHeader("X-Test", "test2");
  request.addEventListener("load", function (event) {
    if (request.status >= 200 && request.status < 300) {
      console.log(request.responseText);
    } else {
      console.warn(request.statusText, request.responseText);
    }
  });
  request.send(JSON.stringify({
    "asdf": "asdfasdf"
  }));
}, 2000);

Gleap.setNetworkLogFilters(["Authentication", "pragma"]);

Gleap.attachNetworkLogs([
  {
    type: "GET",
    url: "https://jsonplaceholder.typicode.com/todos/1",
    date: "2021-12-15T16:41:37.786",
    request: {
      payload: "",
      headers: {
        "cache-control": ["no-cache"],
        "content-type": ["application/json; charset=utf-8"],
        expires: ["-1"],
        pragma: ["no-cache"],
        Authentication: ["asdfasdfasdfasdf"],
      },
    },
    duration: 0,
    success: null,
    response: {
      status: 200,
      statusText: "",
      responseText: {
        userId: 1,
        id: 1,
        title: "delectus aut autem",
        completed: false,
      },
    },
  },
]);
