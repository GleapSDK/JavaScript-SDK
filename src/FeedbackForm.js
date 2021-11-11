import { translateText } from "./Translation";

const formPageClass = "bb-feedback-formpage";

const getTitleHTML = function (title, overrideLanguage, required) {
  if (title === undefined) {
    return "";
  }

  return `<div class="bb-feedback-elementtitle">${translateText(
    title,
    overrideLanguage
  )}${required ? "<span>*</span>" : ""}</div>`;
};

const getFormPageClass = function (formPage) {
  if (formPage === undefined) {
    return "";
  }

  return `${formPageClass} ${formPageClass}-${formPage}`;
};

const renderButtonsForPage = function (
  currentPage,
  totalPages,
  overrideLanguage,
  privacyPolicyEnabled,
  privacyPolicyUrl,
  collectEmail
) {
  const lastButton = currentPage === totalPages - 1;
  let buttonHTML = "";

  if (
    privacyPolicyEnabled &&
    privacyPolicyUrl &&
    privacyPolicyUrl.length > 0 &&
    lastButton
  ) {
    buttonHTML += `<div class="bb-feedback-inputgroup bb-feedback-inputgroup--privacy-policy ${getFormPageClass(
      currentPage
    )}">
      <input id="GleapPrivacyPolicy" class="bb-feedback-privacypolicy" type="checkbox" required />
      <label for="GleapPrivacyPolicy" class="bb-feedback-inputgroup--privacy-policy-label">${translateText(
        "I read and accept the ",
        overrideLanguage
      )}<a id="bb-privacy-policy-link" href="${privacyPolicyUrl}" target="_blank">${translateText(
      "privacy policy",
      overrideLanguage
    )}</a>.</label>
    </div>`;
  }

  buttonHTML += `<div class="bb-feedback-inputgroup bb-feedback-inputgroup-button ${getFormPageClass(
    currentPage
  )}">
      ${
        currentPage > 0
          ? `<div class="bb-feedback-back-button" bb-form-page="${currentPage}">
      ${translateText(`Back`, overrideLanguage)}
    </div>`
          : ""
      }
      <div class="bb-feedback-send-button bb-feedback-next-btn-${currentPage}" bb-form-page="${currentPage}">${translateText(
    lastButton ? `Submit` : `Next`,
    overrideLanguage
  )}</div>
    </div>`;

  return buttonHTML;
};

export const buildForm = function (feedbackOptions, overrideLanguage) {
  const form = feedbackOptions.form;
  var formHTML = "";
  for (var i = 0; i < form.length; i++) {
    const formItem = form[i];
    if (!formItem) {
      break;
    }

    if (formItem.type === "text") {
      formHTML += `<div class="bb-feedback-inputgroup ${getFormPageClass(
        i
      )}">${getTitleHTML(formItem.title, overrideLanguage, formItem.required)}
          <input class="bb-feedback-formdata bb-feedback-${
            formItem.name
          }" bb-form-page="${i}" type="${
        formItem.inputtype
      }" placeholder="${translateText(
        formItem.placeholder,
        overrideLanguage
      )}" />
        </div>`;
    }
    if (formItem.type === "textarea") {
      formHTML += `<div class="bb-feedback-inputgroup ${getFormPageClass(
        i
      )}">${getTitleHTML(formItem.title, overrideLanguage, formItem.required)}
          <textarea class="bb-feedback-formdata bb-feedback-${
            formItem.name
          }" bb-form-page="${i}" placeholder="${translateText(
        formItem.placeholder,
        overrideLanguage
      )}"></textarea>
        </div>`;
    }
    if (formItem.type === "rating") {
      formHTML += `<div class="bb-feedback-rating ${getFormPageClass(
        i
      )}">${getTitleHTML(
        formItem.title,
        overrideLanguage,
        formItem.required
      )}<input class="bb-feedback-formdata bb-feedback-${
        formItem.name
      }" bb-form-page="${i}" type="hidden" />
          <ul class="bb-feedback-emojigroup">
            <li class="bb-feedback-angry" data-value="0">
              <div>
                <svg class="bb-feedback-eye bb-feedback-left">
                    <use xlink:href="#eye">
                </svg>
                <svg class="bb-feedback-eye bb-feedback-right">
                    <use xlink:href="#eye">
                </svg>
                <svg class="bb-feedback-mouth">
                    <use xlink:href="#mouth">
                </svg>
              </div>
            </li>
            <li class="bb-feedback-sad" data-value="2.5">
              <div>
                <svg class="bb-feedback-eye bb-feedback-left">
                    <use xlink:href="#eye">
                </svg>
                <svg class="bb-feedback-eye bb-feedback-right">
                    <use xlink:href="#eye">
                </svg>
                <svg class="bb-feedback-mouth">
                    <use xlink:href="#mouth">
                </svg>
              </div>
            </li>
            <li class="bb-feedback-ok" data-value="5">
                <div></div>
            </li>
            <li class="bb-feedback-good" data-value="7.5">
              <div>
                <svg class="bb-feedback-eye bb-feedback-left">
                    <use xlink:href="#eye">
                </svg>
                <svg class="bb-feedback-eye bb-feedback-right">
                    <use xlink:href="#eye">
                </svg>
                <svg class="bb-feedback-mouth">
                    <use xlink:href="#mouth">
                </svg>
              </div>
            </li>
            <li class="bb-feedback-happy" data-value="10">
              <div>
                <svg class="bb-feedback-eye bb-feedback-left">
                    <use xlink:href="#eye">
                </svg>
                <svg class="bb-feedback-eye bb-feedback-right">
                    <use xlink:href="#eye">
                </svg>
              </div>
          </li>
        </ul>
        <svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
            <symbol xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 4" id="eye">
                <path d="M1,1 C1.83333333,2.16666667 2.66666667,2.75 3.5,2.75 C4.33333333,2.75 5.16666667,2.16666667 6,1"></path>
            </symbol>
            <symbol xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 7" id="mouth">
                <path d="M1,5.5 C3.66666667,2.5 6.33333333,1 9,1 C11.6666667,1 14.3333333,2.5 17,5.5"></path>
            </symbol>
        </svg>
        </div>`;
    }

    if (formItem.type !== "rating") {
      formHTML += renderButtonsForPage(
        i,
        form.length,
        overrideLanguage,
        feedbackOptions.privacyPolicyEnabled,
        feedbackOptions.privacyPolicyUrl,
        feedbackOptions.collectEmail
      );
    }
  }

  return formHTML;
};

export const getFormData = function (form) {
  var formData = {};
  for (var i = 0; i < form.length; i++) {
    const formItem = form[i];
    const formElement = document.querySelector(`.bb-feedback-${formItem.name}`);
    if (formElement && formElement.value) {
      formData[formItem.name] = formElement.value;
    }
  }
  return formData;
};

export const rememberForm = function (form) {
  for (var i = 0; i < form.length; i++) {
    const formItem = form[i];
    if (formItem.remember) {
      const formElement = document.querySelector(
        `.bb-feedback-${formItem.name}`
      );
      if (formElement && formElement.value) {
        try {
          localStorage.setItem(
            `bb-remember-${formItem.name}`,
            formElement.value
          );
        } catch (exp) {}
      }
    }
  }
};

export const validateForm = function (form) {
  var formValid = true;
  for (var i = 0; i < form.length; i++) {
    const formItem = form[i];
    if (!validateFormItem(formItem)) {
      formValid = false;
    }
  }
  return formValid;
};

const validateEmail = function (email) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

export const validateFormItem = function (formItem, showError = true) {
  var valid = true;
  const formElement = document.querySelector(`.bb-feedback-${formItem.name}`);
  const currentPage = parseInt(formElement.getAttribute("bb-form-page"));
  if (
    (formItem.type === "text" || formItem.type === "textarea") &&
    formItem.required
  ) {
    if (!formElement.value || formElement.value === "") {
      showError && formElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.classList.remove("bb-feedback-required");
    }
  }
  if (
    formItem.type === "text" &&
    formItem.inputtype === "email" &&
    formItem.required
  ) {
    if (!validateEmail(formElement.value)) {
      showError && formElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.classList.remove("bb-feedback-required");
    }
  }
  if (formItem.type === "rating" && formItem.required) {
    if (!formElement.value || formElement.value === "") {
      showError &&
        formElement.parentElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.parentElement.classList.remove("bb-feedback-required");
    }
  }
  if (formItem.type === "privacypolicy" && formItem.required) {
    if (!formElement.checked) {
      showError &&
        formElement.parentElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.parentElement.classList.remove("bb-feedback-required");
    }
  }

  if (currentPage) {
    const currentNextButton = document.querySelector(
      `.bb-feedback-next-btn-${currentPage}`
    );
    if (currentNextButton) {
      if (!valid) {
        currentNextButton.setAttribute("disabled", "true");
        currentNextButton.classList.add("bb-feedback-send-button--disabled");
      } else {
        currentNextButton.removeAttribute("disabled");
        currentNextButton.classList.remove("bb-feedback-send-button--disabled");
      }
    }
  }

  return valid;
};

const handleNextFormStep = function (currentPage, pagesCount, submitForm) {
  if (currentPage === pagesCount - 1) {
    submitForm();
  } else {
    showFormPage(currentPage + 1);
  }
};

const showFormPage = function (pageToShow) {
  const formPagesToHide = document.querySelectorAll(`.${formPageClass}`);
  for (var i = 0; i < formPagesToHide.length; i++) {
    if (formPagesToHide[i]) {
      formPagesToHide[i].style.display = "none";
    }
  }

  console.log("SHOW: " + pageToShow);

  const formPagesToShow = document.querySelectorAll(
    `.${formPageClass}-${pageToShow}`
  );
  console.log(formPagesToShow);
  for (var i = 0; i < formPagesToShow.length; i++) {
    if (formPagesToShow[i]) {
      formPagesToShow[i].style.display = "flex";
    }
  }
};

export const hookForm = function (form, submitForm) {
  // Hook up submit buttons
  const sendButtons = document.querySelectorAll(".bb-feedback-send-button");
  for (var i = 0; i < sendButtons.length; i++) {
    const sendButton = sendButtons[i];
    sendButton.onclick = function () {
      console.log(sendButton);
      if (
        sendButton.getAttribute("disabled") !== "true" &&
        sendButton.getAttribute("bb-form-page")
      ) {
        const currentPage = parseInt(sendButton.getAttribute("bb-form-page"));
        handleNextFormStep(currentPage, form.length, submitForm);
      }
    };
  }

  // Hook up back buttons
  const backButtons = document.querySelectorAll(".bb-feedback-back-button");
  for (var i = 0; i < backButtons.length; i++) {
    const backButton = backButtons[i];
    backButton.onclick = function () {
      if (
        backButton.getAttribute("disabled") !== "true" &&
        backButton.getAttribute("bb-form-page")
      ) {
        const currentFormPage = parseInt(
          backButton.getAttribute("bb-form-page")
        );
        showFormPage(currentFormPage - 1);
      }
    };
  }

  // Hook up form
  for (var i = 0; i < form.length; i++) {
    const formItem = form[i];
    if (!formItem) {
      break;
    }
    const formInput = document.querySelector(`.bb-feedback-${formItem.name}`);
    const currentPage = parseInt(formInput.getAttribute("bb-form-page"));
    if (formItem.type === "text") {
      if (formItem.remember) {
        try {
          const rememberedValue = localStorage.getItem(
            `bb-remember-${formItem.name}`
          );
          if (rememberedValue) {
            formInput.value = rememberedValue;
          }
        } catch (exp) {}
      }
      if (formItem.defaultValue) {
        formInput.value = formItem.defaultValue;
      }
      formInput.addEventListener("focusout", function () {
        validateFormItem(formItem);
      });
      formInput.oninput = function () {
        validateFormItem(formItem, false);
      };
    }
    if (formItem.type === "privacypolicy") {
      formInput.onchange = function () {
        validateFormItem(formItem);
      };
    }
    if (formItem.type === "textarea") {
      formInput.style.height = "inherit";
      formInput.style.height = formInput.scrollHeight + "px";
      formInput.oninput = function () {
        formInput.style.height = "inherit";
        formInput.style.height = formInput.scrollHeight + "px";
        validateFormItem(formItem);
      };
    }
    if (formItem.type === "rating") {
      const ratingItems = document.querySelectorAll(
        ".bb-feedback-emojigroup li"
      );
      for (var j = 0; j < ratingItems.length; j++) {
        const ratingItem = ratingItems[j];
        ratingItem.addEventListener("click", function (e) {
          formInput.value = ratingItem.getAttribute("data-value");
          validateFormItem(formItem);
          const lastActiveItem = document.querySelector(
            ".bb-feedback-emojigroup li.bb-feedback-active"
          );
          if (lastActiveItem) {
            lastActiveItem.classList.remove("bb-feedback-active");
          }
          ratingItem.classList.add("bb-feedback-active");
          e.preventDefault();

          // Show next step.
          handleNextFormStep(currentPage, form.length, submitForm);
        });
      }
    }

    // Validate form item initially.
    validateFormItem(formItem, false);
  }

  // Show first page.
  showFormPage(0);
};
