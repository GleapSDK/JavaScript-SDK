import { translateText } from "./Translation";

const showAfterClass = "bb-feedback-showafter";

const getTitleHTML = function (title, overrideLanguage, required) {
  if (title === undefined) {
    return "";
  }

  return `<div class="bb-feedback-elementtitle">${translateText(
    title,
    overrideLanguage
  )}${required ? "<span>*</span>" : ""}</div>`;
};

const getShowAfterHTML = function (showAfter) {
  if (showAfter === undefined) {
    return "";
  }

  return `${showAfterClass} ${showAfterClass}-${showAfter}`;
};

export const buildForm = function (form, overrideLanguage) {
  var formHTML = "";
  var formContainsShowAfter = false;
  for (let i = 0; i < form.length; i++) {
    const formItem = form[i];
    if (!formItem) {
      break;
    }
    if (formItem.showAfter) {
      formContainsShowAfter = true;
    }
    if (formItem.type === "text") {
      formHTML += `<div class="bb-feedback-inputgroup ${getShowAfterHTML(
        formItem.showAfter
      )}">${getTitleHTML(formItem.title, overrideLanguage, formItem.required)}
          <input class="bb-feedback-formdata bb-feedback-${
            formItem.name
          }" type="${formItem.inputtype}" placeholder="${translateText(
        formItem.placeholder,
        overrideLanguage
      )}" />
        </div>`;
    }
    if (formItem.type === "privacypolicy") {
      formHTML += `<div class="bb-feedback-inputgroup bb-feedback-inputgroup--privacy-policy ${getShowAfterHTML(
        formItem.showAfter
      )}">
        <input id="bugbattlePrivacyPolicy" class="bb-feedback-${
          formItem.name
        }" type="checkbox" required />
        <label for="bugbattlePrivacyPolicy" class="bb-feedback-inputgroup--privacy-policy-label">${translateText(
          "I read and accept the",
          overrideLanguage
        )}<a id="bb-privacy-policy-link" href="${
        formItem.url
      }" target="_blank">${translateText(
        " privacy policy",
        overrideLanguage
      )}</a>.</label>
      </div>`;
    }
    if (formItem.type === "spacer") {
      formHTML += `<div class="bb-feedback-inputgroup bb-feedback-inputgroup-spacer ${getShowAfterHTML(
        formItem.showAfter
      )}"></div>`;
    }
    if (formItem.type === "submit") {
      formHTML += `<div class="bb-feedback-inputgroup bb-feedback-inputgroup-button ${getShowAfterHTML(
        formItem.showAfter
      )}">
        <div class="bb-feedback-send-button">${translateText(
          formItem.title,
          overrideLanguage,
          formItem.required
        )}</div>
      </div>`;
    }
    if (formItem.type === "textarea") {
      formHTML += `<div class="bb-feedback-inputgroup ${getShowAfterHTML(
        formItem.showAfter
      )}">${getTitleHTML(formItem.title, overrideLanguage, formItem.required)}
          <textarea class="bb-feedback-formdata bb-feedback-${
            formItem.name
          }" placeholder="${translateText(
        formItem.placeholder,
        overrideLanguage
      )}"></textarea>
        </div>`;
    }
    if (formItem.type === "rating") {
      formHTML += `<div class="bb-feedback-rating ${getShowAfterHTML(
        formItem.showAfter
      )}">${getTitleHTML(
        formItem.title,
        overrideLanguage,
        formItem.required
      )}<input class="bb-feedback-formdata bb-feedback-${
        formItem.name
      }" type="hidden" />
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
  }

  return {
    formHTML,
    formContainsShowAfter,
  };
};

export const getFormData = function (form) {
  var formData = {};
  for (let i = 0; i < form.length; i++) {
    const formItem = form[i];
    const formElement = document.querySelector(
      `.bb-feedback-${formItem.name}`
    );
    if (formElement && formElement.value) {
      formData[formItem.name] = formElement.value;
    }
  }
  return formData;
};

export const rememberForm = function (form) {
  for (let i = 0; i < form.length; i++) {
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
  for (let i = 0; i < form.length; i++) {
    const formItem = form[i];
    if (!validateFormItem(formItem)) {
      formValid = false;
    }
  }
  return formValid;
};

export const validateFormItem = function (formItem) {
  var valid = true;
  const formElement = document.querySelector(
    `.bb-feedback-${formItem.name}`
  );
  if (
    (formItem.type === "text" || formItem.type === "textarea") &&
    formItem.required
  ) {
    if (!formElement.value || formElement.value === "") {
      formElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.classList.remove("bb-feedback-required");
    }
  }
  if (formItem.type === "rating" && formItem.required) {
    if (!formElement.value || formElement.value === "") {
      formElement.parentElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.parentElement.classList.remove("bb-feedback-required");
    }
  }
  if (formItem.type === "privacypolicy" && formItem.required) {
    if (!formElement.checked) {
      formElement.parentElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.parentElement.classList.remove("bb-feedback-required");
    }
  }
  const elementsToShow = document.querySelectorAll(
    `.${showAfterClass}-${formItem.name}`
  );
  for (var i = 0; i < elementsToShow.length; i++) {
    if (elementsToShow[i]) {
      elementsToShow[i].style.display = valid ? "flex" : "none";
    }
  }

  return valid;
};

export const hookForm = function (form) {
  for (let i = 0; i < form.length; i++) {
    const formItem = form[i];
    if (!formItem) {
      break;
    }
    const formInput = document.querySelector(
      `.bb-feedback-${formItem.name}`
    );
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
      if (formItem.defaultValue && formItem.hideOnDefaultSet) {
        formInput.parentElement.classList.add("bb-feedback-form--hidden");
      }
      formInput.oninput = function () {
        validateFormItem(formItem);
      };
    }
    if (formItem.type === "privacypolicy") {
      formInput.onchange = function () {
        validateFormItem(formItem);
      };
    }
    if (formItem.type === "textarea") {
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
        });
      }
    }
  }
};
