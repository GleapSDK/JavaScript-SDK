const Gleap = window.Gleap;

Gleap.setFrameUrl("http://0.0.0.0:3001");
Gleap.setApiUrl("http://0.0.0.0:9000");
Gleap.setWSApiUrl("ws://0.0.0.0:9000");

Gleap.initialize("SWDRYt539LLdlWtMLGYVos7oIAbWQPbX");

// const lastMonthDate = new Date();
// lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

// Gleap.showSurvey("c01abef016b8efb03a9a", "survey_full");

// Gleap.startChecklist("677694a38779ab927064d967");

// Gleap.trackEvent("Add New List");
// Gleap.trackEvent("Step 2 resolved");
// Gleap.trackEvent("Step 3 resolved");

// setTimeout(() => {
// Gleap.trackEvent("Step 4 resolved");
// }, 4000);
// Gleap.setTicketAttribute("qwerrewq", "Custom value")
// Gleap.attachCustomData({
//     test: "dataaa",
// })
// Gleap.startBot("6789110e41e9869af7a2b6b8")

// Get checklist data
/*Gleap.getChecklistData("68872462bfc42d80c3838e3d", "project_X4").then((data) => {
    console.log(data);
});

// Listen for checklist events
Gleap.on('checklist-loaded', (data) => {
  console.log('Checklist loaded:', data);
});

Gleap.on('checklist-step-completed', (data) => {
  console.log('Step completed:', data.stepId);
});

Gleap.on('checklist-completed', (data) => {
  console.log('Checklist completed!');
});*/