import { translateText } from "./Translation";

const showAfterClass = "bugbattle-feedback-showafter";

const getTitleHTML = function (title, overrideLanguage) {
  if (title === undefined) {
    return "";
  }

  return `<div class="bugbattle-feedback-elementtitle">${translateText(
    title,
    overrideLanguage
  )}</div>`;
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
      formHTML += `<div class="bugbattle-feedback-inputgroup ${getShowAfterHTML(
        formItem.showAfter
      )}">${getTitleHTML(formItem.title, overrideLanguage)}
          <input class="bugbattle-feedback-formdata bugbattle-feedback-${
            formItem.name
          }" type="${formItem.inputtype}" placeholder="${translateText(
        formItem.placeholder,
        overrideLanguage
      )}${formItem.required ? "*" : ""}" />
        </div>`;
    }
    if (formItem.type === "privacypolicy") {
      formHTML += `<div class="bugbattle-feedback-inputgroup bugbattle-feedback-inputgroup--privacy-policy ${getShowAfterHTML(
        formItem.showAfter
      )}">
        <input id="bugbattlePrivacyPolicy" class="bugbattle-feedback-${
          formItem.name
        }" type="checkbox" required />
        <label for="bugbattlePrivacyPolicy" class="bugbattle-feedback-inputgroup--privacy-policy-label">${translateText(
          "I read and accept the",
          overrideLanguage
        )}<a id="bugbattle-privacy-policy-link" href="${
        formItem.url
      }" target="_blank">${translateText(
        " privacy policy",
        overrideLanguage
      )}</a>.</label>
      </div>`;
    }
    if (formItem.type === "submit") {
      formHTML += `<div class="bugbattle-feedback-inputgroup bugbattle-feedback-inputgroup-button ${getShowAfterHTML(
        formItem.showAfter
      )}">
        <div class="bugbattle-feedback-send-button">${translateText(
          formItem.title,
          overrideLanguage
        )}</div>
      </div>`;
    }
    if (formItem.type === "textarea") {
      formHTML += `<div class="bugbattle-feedback-inputgroup ${getShowAfterHTML(
        formItem.showAfter
      )}">${getTitleHTML(formItem.title, overrideLanguage)}
          <textarea class="bugbattle-feedback-formdata bugbattle-feedback-${
            formItem.name
          }" placeholder="${translateText(
        formItem.placeholder,
        overrideLanguage
      )}${formItem.required ? "*" : ""}"></textarea>
        </div>`;
    }
    if (formItem.type === "rating") {
      formHTML += `<div class="bugbattle-feedback-rating ${getShowAfterHTML(
        formItem.showAfter
      )}">${getTitleHTML(
        formItem.title,
        overrideLanguage
      )}<input class="bugbattle-feedback-formdata bugbattle-feedback-${
        formItem.name
      }" type="hidden" />
          <ul class="bugbattle-feedback-emojigroup">
            <li class="bugbattle-feedback-angry" data-value="0">
              <div>
                <svg class="bugbattle-feedback-eye bugbattle-feedback-left">
                    <use xlink:href="#eye">
                </svg>
                <svg class="bugbattle-feedback-eye bugbattle-feedback-right">
                    <use xlink:href="#eye">
                </svg>
                <svg class="bugbattle-feedback-mouth">
                    <use xlink:href="#mouth">
                </svg>
              </div>
            </li>
            <li class="bugbattle-feedback-sad" data-value="2.5">
              <div>
                <svg class="bugbattle-feedback-eye bugbattle-feedback-left">
                    <use xlink:href="#eye">
                </svg>
                <svg class="bugbattle-feedback-eye bugbattle-feedback-right">
                    <use xlink:href="#eye">
                </svg>
                <svg class="bugbattle-feedback-mouth">
                    <use xlink:href="#mouth">
                </svg>
              </div>
            </li>
            <li class="bugbattle-feedback-ok" data-value="5">
                <div></div>
            </li>
            <li class="bugbattle-feedback-good" data-value="7.5">
              <div>
                <svg class="bugbattle-feedback-eye bugbattle-feedback-left">
                    <use xlink:href="#eye">
                </svg>
                <svg class="bugbattle-feedback-eye bugbattle-feedback-right">
                    <use xlink:href="#eye">
                </svg>
                <svg class="bugbattle-feedback-mouth">
                    <use xlink:href="#mouth">
                </svg>
              </div>
            </li>
            <li class="bugbattle-feedback-happy" data-value="10">
              <div>
                <svg class="bugbattle-feedback-eye bugbattle-feedback-left">
                    <use xlink:href="#eye">
                </svg>
                <svg class="bugbattle-feedback-eye bugbattle-feedback-right">
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
      `.bugbattle-feedback-${formItem.name}`
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
        `.bugbattle-feedback-${formItem.name}`
      );
      if (formElement && formElement.value) {
        try {
          localStorage.setItem(
            `bugbattle-remember-${formItem.name}`,
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
    `.bugbattle-feedback-${formItem.name}`
  );
  if (
    (formItem.type === "text" || formItem.type === "textarea") &&
    formItem.required
  ) {
    if (!formElement.value || formElement.value === "") {
      formElement.classList.add("bugbattle-feedback-required");
      valid = false;
    } else {
      formElement.classList.remove("bugbattle-feedback-required");
    }
  }
  if (formItem.type === "rating" && formItem.required) {
    if (!formElement.value || formElement.value === "") {
      formElement.parentElement.classList.add("bugbattle-feedback-required");
      valid = false;
    } else {
      formElement.parentElement.classList.remove("bugbattle-feedback-required");
    }
  }
  if (formItem.type === "privacypolicy" && formItem.required) {
    if (!formElement.checked) {
      formElement.parentElement.classList.add("bugbattle-feedback-required");
      valid = false;
    } else {
      formElement.parentElement.classList.remove("bugbattle-feedback-required");
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
    console.log(formItem);
    const formInput = document.querySelector(
      `.bugbattle-feedback-${formItem.name}`
    );
    if (formItem.type === "text") {
      if (formItem.remember) {
        try {
          const rememberedValue = localStorage.getItem(
            `bugbattle-remember-${formItem.name}`
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
        formInput.style.display = "none";
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
        ".bugbattle-feedback-emojigroup li"
      );
      for (var j = 0; j < ratingItems.length; j++) {
        const ratingItem = ratingItems[j];
        ratingItem.addEventListener("click", function (e) {
          formInput.value = ratingItem.getAttribute("data-value");
          validateFormItem(formItem);
          const lastActiveItem = document.querySelector(
            ".bugbattle-feedback-emojigroup li.bugbattle-feedback-active"
          );
          if (lastActiveItem) {
            lastActiveItem.classList.remove("bugbattle-feedback-active");
          }
          ratingItem.classList.add("bugbattle-feedback-active");
          e.preventDefault();
        });
      }
    }
  }
};
