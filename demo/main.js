const Gleap = window.Gleap;

Gleap.setFrameUrl("http://0.0.0.0:3001");
Gleap.setApiUrl("http://0.0.0.0:9000");
Gleap.setWSApiUrl("ws://0.0.0.0:9000");

Gleap.setLanguage("ar-DZ");

Gleap.initialize("VHKvTzWV8jKjms6mWWygiUDWlL8zs7an");

// const lastMonthDate = new Date();
// lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

Gleap.identify("94383829393", {
    email: "luca@gleap.io",
    name: "Luca Blaser",
})

Gleap.open();
// Gleap.showSurvey("c01abef016b8efb03a9a", "survey_full");


// Gleap.startChecklist("677694a38779ab927064d967");

// Gleap.trackEvent("Add New List");
// Gleap.trackEvent("Step 2 resolved");
// Gleap.trackEvent("Step 3 resolved");

// Gleap.setTicketAttribute("qwerrewq", "Custom value")
// Gleap.attachCustomData({
//     test: "dataaa",
// })
// Gleap.startBot("6789110e41e9869af7a2b6b8")