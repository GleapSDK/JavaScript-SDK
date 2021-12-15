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
    "GET",
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
  request.send();
}, 2000);
