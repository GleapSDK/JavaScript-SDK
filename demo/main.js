const Gleap = window.Gleap;

Gleap.setApiUrl("http://localhost:9000");
Gleap.initialize("ogWhNhuiZcGWrva5nlDS8l7a78OfaLlV");
Gleap.identify(123, {
  email: "lukas@gle.cooooooa",
  name: "Lukas",
});

/*function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * 
charactersLength));
 }
 return result;
}

setInterval(() => {
  document.getElementById("rand").innerText = makeid(1000);
}, 1);*/