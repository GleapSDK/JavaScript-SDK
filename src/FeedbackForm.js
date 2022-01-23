import MarkerManager from "./MarkerManager";
import Session from "./Session";
import { translateText } from "./Translation";
import { loadIcon, setLoadingIndicatorProgress } from "./UI";

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

const getDescriptionHTML = function (description, overrideLanguage) {
  if (description === undefined || description.length === 0) {
    return "";
  }

  return `<div class="bb-feedback-form-description">${translateText(
    description,
    overrideLanguage
  )}</div>`;
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
  overrideLanguage
) {
  const lastButton = currentPage === totalPages - 1;
  return `<div class="bb-feedback-inputgroup bb-feedback-inputgroup-button ${getFormPageClass(
    currentPage
  )}">
      <div class="bb-feedback-send-button bb-feedback-next-btn-${currentPage}" bb-form-page="${currentPage}">${translateText(
    lastButton ? `Submit` : `Next`,
    overrideLanguage
  )}</div>
    </div>`;
};

const isTypeAutoNext = function (type) {
  if (type === "rating" || type === "onetofive") {
    return true;
  }

  return false;
};

export const buildForm = function (feedbackOptions, overrideLanguage) {
  const form = feedbackOptions.form;
  var formHTML = `<div class="bb-form-progress"><div class="bb-form-progress-inner"></div></div>`;
  for (var i = 0; i < form.length; i++) {
    const formItem = form[i];
    if (!formItem) {
      break;
    }

    // Determine current page.
    const currentPage = formItem.page;
    const formItemData = `bb-form-page="${currentPage}" bb-form-item="${encodeURIComponent(
      JSON.stringify(formItem)
    )}"`;

    if (formItem.type === "text") {
      formHTML += `<div class="bb-feedback-inputgroup ${getFormPageClass(
        currentPage
      )}">
      ${getDescriptionHTML(formItem.description, overrideLanguage)}
      ${getTitleHTML(formItem.title, overrideLanguage, formItem.required)}
          <input class="bb-feedback-formdata bb-feedback-${
            formItem.name
          }" ${formItemData} type="${
        formItem.inputtype
      }" placeholder="${translateText(
        formItem.placeholder,
        overrideLanguage
      )}" />
      </div>`;
    }
    if (formItem.type === "capture") {
      formHTML += `<div class="bb-feedback-inputgroup ${getFormPageClass(
        currentPage
      )}">
        ${getDescriptionHTML(formItem.description, overrideLanguage)}
        ${getTitleHTML(formItem.title, overrideLanguage, formItem.required)}
        <input class="bb-feedback-formdata bb-feedback-${
          formItem.name
        }" ${formItemData} type="hidden" />
        <div class="bb-feedback-capture-items">
          <div class="bb-feedback-capture-item" data-type="screenshot">
            ${loadIcon("screenshot")}
            <span>Mark the bug</span>
          </div>
          <div class="bb-feedback-capture-item" data-type="capture">
            ${loadIcon("camera")}
            <span>Record screen</span>
          </div>
        </div>
        <div class="bb-feedback-capture-item-selected">
          <div class="bb-feedback-capture-item-selected-icon"></div>
          <div class="bb-feedback-capture-item-selected-label"></div>
          <div class="bb-feedback-capture-item-selected-action">${loadIcon(
            "dismiss"
          )}</div>
        </div>
      </div>`;
    }
    if (formItem.type === "upload") {
      var acceptAttribute = "";
      if (formItem.restrictions && formItem.restrictions.length > 0) {
        acceptAttribute = `accept="${formItem.restrictions}"`;
      }
      formHTML += `<div class="bb-feedback-inputgroup ${getFormPageClass(
        currentPage
      )}">
      ${getDescriptionHTML(formItem.description, overrideLanguage)}
      ${getTitleHTML(formItem.title, overrideLanguage, formItem.required)}
      <div class="bb-feedback-dialog-loading bb-feedback-dialog-loading--${
        formItem.name
      }">
        <svg
          class="bb--progress-ring"
          width="120"
          height="120">
          <circle
            class="bb--progress-ring__circle"
            stroke="${Gleap.getInstance().mainColor}"
            stroke-width="6"
            fill="transparent"
            r="34"
            cx="60"
            cy="60"/>
        </svg>
      </div>
      <input class="bb-feedback-formdata bb-feedback-${
        formItem.name
      }" ${formItemData} type="hidden" />
        <input class="bb-feedback-formdata bb-form-fileupload-${
          formItem.name
        }" type="file" ${acceptAttribute} />
        <span class="bb-feedback-filesizeinfo bb-feedback-filesizeinfo-${
          formItem.name
        }">${translateText(
        "The file you chose exceeds the file size limit of 3MB.",
        overrideLanguage
      )}</span>
      </div>`;
    }
    if (formItem.type === "textarea") {
      formHTML += `<div class="bb-feedback-inputgroup ${getFormPageClass(
        currentPage
      )}">
      ${getDescriptionHTML(formItem.description, overrideLanguage)}
      ${getTitleHTML(formItem.title, overrideLanguage, formItem.required)}
          <textarea class="bb-feedback-formdata bb-feedback-${
            formItem.name
          }" ${formItemData} placeholder="${translateText(
        formItem.placeholder,
        overrideLanguage
      )}"></textarea>
        </div>`;
    }
    if (formItem.type === "privacypolicy") {
      formHTML += `<div class="bb-feedback-inputgroup bb-feedback-inputgroup--privacy-policy ${getFormPageClass(
        currentPage
      )}">
        <input id="gleap-privacy-policy" ${formItemData} class="bb-feedback-${
        formItem.name
      }" type="checkbox" required />
        <label for="gleap-privacy-policy" class="bb-feedback-inputgroup--privacy-policy-label">${translateText(
          "I read and accept the ",
          overrideLanguage
        )}<a id="bb-privacy-policy-link" href="${
        formItem.url
      }" target="_blank">${translateText(
        "privacy policy",
        overrideLanguage
      )}</a>.</label>
      </div>`;
    }
    if (formItem.type === "rating") {
      formHTML += `<div class="bb-feedback-rating ${getFormPageClass(
        currentPage
      )} bb-feedback-rating-${formItem.name}" ${formItemData}">
      ${getDescriptionHTML(formItem.description, overrideLanguage)}
      ${getTitleHTML(formItem.title, overrideLanguage, formItem.required)}
      <input class="bb-feedback-formdata bb-feedback-${
        formItem.name
      }" ${formItemData} type="hidden" />
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
    if (formItem.type === "onetofive") {
      const getNumberButtonHTML = function (formItem, number) {
        return `<div class="bb-feedback-onetofive-button" data-value="${number}">${number}</div>`;
      };

      formHTML += `<div class="bb-feedback-onetofive ${getFormPageClass(
        currentPage
      )} bb-feedback-onetofive-${formItem.name}" ${formItemData}">
      ${getDescriptionHTML(formItem.description, overrideLanguage)}
      ${getTitleHTML(formItem.title, overrideLanguage, formItem.required)}
      <input class="bb-feedback-formdata bb-feedback-${
        formItem.name
      }" ${formItemData} type="hidden" />
        <div class="bb-feedback-onetofive-buttons">
          ${getNumberButtonHTML(formItem, 1)}
          ${getNumberButtonHTML(formItem, 2)}
          ${getNumberButtonHTML(formItem, 3)}
          ${getNumberButtonHTML(formItem, 4)}
          ${getNumberButtonHTML(formItem, 5)}
        </div>
        <div class="bb-feedback-onetofive-description"><span>${translateText(
          formItem.lowestValueLabel,
          overrideLanguage
        )}</span><span>${translateText(
        formItem.highestValueLabel,
        overrideLanguage
      )}</span></div>
      </div>`;
    }
    if (
      formItem.type === "multiplechoice" &&
      formItem.choices &&
      formItem.choices.length > 0
    ) {
      const getOptionHTML = function (formItem, value) {
        return `<label class="bb-feedback-multiplechoice-container" data-value="${value}">${value}
        <input type="radio" name="${formItem.name}" />
        <span class="bb-feedback-multiplechoice-checkmark"></span>
      </label>`;
      };

      var optionHTML = "";
      for (var j = 0; j < formItem.choices.length; j++) {
        optionHTML += getOptionHTML(formItem, formItem.choices[j]);
      }

      formHTML += `<div class="bb-feedback-multiplechoice ${getFormPageClass(
        currentPage
      )} bb-feedback-multiplechoice-${formItem.name}" ${formItemData}>
      ${getDescriptionHTML(formItem.description, overrideLanguage)}
      ${getTitleHTML(formItem.title, overrideLanguage, formItem.required)}
      <input class="bb-feedback-formdata bb-feedback-${
        formItem.name
      }" ${formItemData} type="hidden" />
      ${optionHTML}
      </div>`;
    }

    if (
      ((form[i + 1] && form[i + 1].page !== currentPage) ||
        i + 1 === form.length) &&
      !isTypeAutoNext(formItem.type)
    ) {
      formHTML += renderButtonsForPage(
        currentPage,
        feedbackOptions.pages,
        overrideLanguage
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

const validateEmail = function (email) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

export const validateFormItem = function (formItem, shouldShowError = true) {
  var valid = true;
  const formElement = document.querySelector(`.bb-feedback-${formItem.name}`);
  if (!formElement) {
    return false;
  }

  const formElementDirtyFlag = formElement.getAttribute("bb-dirty");
  const showError = shouldShowError && formElementDirtyFlag === "true";

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
  if (formItem.type === "upload" && formItem.required) {
    if (!formElement.value || formElement.value === "") {
      showError &&
        formElement.parentElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.parentElement.classList.remove("bb-feedback-required");
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
  if (formItem.type === "onetofive" && formItem.required) {
    if (!formElement.value || formElement.value === "") {
      showError &&
        formElement.parentElement.classList.add("bb-feedback-required");
      valid = false;
    } else {
      formElement.parentElement.classList.remove("bb-feedback-required");
    }
  }
  if (formItem.type === "multiplechoice" && formItem.required) {
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

  return valid;
};

const updateFormProgressBar = function (currentPage, pages) {
  const innerProgressBar = document.querySelector(`.bb-form-progress-inner`);
  if (innerProgressBar && pages > 0) {
    var progress = Math.round(((currentPage + 1) / pages) * 100);
    if (progress > 100) {
      progress = 100;
    }
    innerProgressBar.style.width = `${progress}%`;
  }
};

const handleNextFormStep = function (currentPage, pages, submitForm) {
  if (!validateFormPage(currentPage)) {
    return;
  }

  updateFormProgressBar(currentPage + 1, pages);
  if (currentPage === pages - 1) {
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

  const formPagesToShow = document.querySelectorAll(
    `.${formPageClass}-${pageToShow}`
  );
  for (var i = 0; i < formPagesToShow.length; i++) {
    if (formPagesToShow[i]) {
      formPagesToShow[i].style.display = "flex";
    }
  }
};

const addDirtyFlagToFormElement = function (formElement) {
  formElement.setAttribute("bb-dirty", "true");
};

export const hookForm = function (formOptions, submitForm, overrideLanguage) {
  const form = formOptions.form;
  const singlePageForm = formOptions.singlePageForm;

  // Hook up submit buttons
  const sendButtons = document.querySelectorAll(".bb-feedback-send-button");
  for (var i = 0; i < sendButtons.length; i++) {
    const sendButton = sendButtons[i];
    sendButton.onclick = function () {
      if (
        sendButton &&
        sendButton.getAttribute("disabled") !== "true" &&
        sendButton.getAttribute("bb-form-page")
      ) {
        const currentPage = parseInt(sendButton.getAttribute("bb-form-page"));
        handleNextFormStep(currentPage, formOptions.pages, submitForm);
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
    if (!formInput) {
      break;
    }
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
      if (formItem.defaultValue && formItem.hideOnDefaultSet) {
        formInput.parentElement.classList.add("bb-feedback-form--hidden");
      }
      formInput.addEventListener("focusin", function () {
        addDirtyFlagToFormElement(formInput);
      });
      formInput.addEventListener("focusout", function () {
        validateFormPage(currentPage);
      });
      formInput.oninput = function () {
        validateFormPage(currentPage, false);
      };
    }
    if (formItem.type === "privacypolicy") {
      formInput.onchange = function () {
        addDirtyFlagToFormElement(formInput);
        validateFormPage(currentPage);
      };
    }
    if (formItem.type === "capture") {
      const captureItemsContainer = document.querySelector(
        `.bb-feedback-capture-items`
      );
      const captureItems = document.querySelectorAll(
        `.bb-feedback-capture-item`
      );
      const selectedItem = document.querySelector(
        ".bb-feedback-capture-item-selected"
      );
      const selectedItemLabel = document.querySelector(
        ".bb-feedback-capture-item-selected-label"
      );
      const selectedItemIcon = document.querySelector(
        ".bb-feedback-capture-item-selected-icon"
      );
      const selectedItemAction = document.querySelector(
        ".bb-feedback-capture-item-selected-action"
      );

      for (var j = 0; j < captureItems.length; j++) {
        const captureItem = captureItems[j];
        const type = captureItem.getAttribute("data-type");
        captureItem.onclick = function () {
          const manager = new MarkerManager(type);
          manager.show(function (success) {
            if (!success) {
              manager.clear();
            } else {
              var actionLabel = "";
              if (type === "screenshot") {
                actionLabel = translateText(
                  "Marked screenshot added",
                  overrideLanguage
                );
              } else {
                actionLabel = translateText(
                  "Screen recording added",
                  overrideLanguage
                );
              }
              selectedItemLabel.innerHTML = actionLabel;
              selectedItemIcon.innerHTML =
                type === "screenshot"
                  ? loadIcon("screenshot")
                  : loadIcon("camera");
              captureItemsContainer.style.display = "none";
              selectedItem.style.display = "flex";
              selectedItemAction.onclick = function () {
                manager.clear();
                captureItemsContainer.style.display = "flex";
                selectedItem.style.display = "none";

                // asdf
              };
            }
          });
        };
      }
    }
    if (formItem.type === "upload") {
      const formFileUploadInput = document.querySelector(
        `.bb-form-fileupload-${formItem.name}`
      );
      const fileSizeInfo = document.querySelector(
        `.bb-feedback-filesizeinfo-${formItem.name}`
      );
      if (formFileUploadInput) {
        formFileUploadInput.addEventListener("change", function () {
          addDirtyFlagToFormElement(formInput);
          validateFormPage(currentPage);
          if (fileSizeInfo) {
            fileSizeInfo.style.display = "none";
          }
          if (
            formFileUploadInput.files &&
            formFileUploadInput.files.length > 0
          ) {
            var file = formFileUploadInput.files[0];
            if (file.size / 1024 / 1024 > 3) {
              if (fileSizeInfo) {
                fileSizeInfo.style.display = "block";
              }
              return;
            }

            var formData = new FormData();
            formData.append("file", file);

            var uploadLoader = document.querySelector(
              `.bb-feedback-dialog-loading--${formItem.name}`
            );
            if (uploadLoader) {
              uploadLoader.style.display = "flex";
              formFileUploadInput.style.display = "none";
            }

            var xhr = new XMLHttpRequest();
            xhr.open(
              "POST",
              Session.getInstance().apiUrl + "/uploads/attachments"
            );
            Session.getInstance().injectSession(xhr);
            xhr.upload.onprogress = function (e) {
              if (e.lengthComputable) {
                const percentComplete = parseInt((e.loaded / e.total) * 100);
                setLoadingIndicatorProgress(percentComplete, formItem.name);
              }
            };
            xhr.onerror = function () {
              if (uploadLoader) {
                uploadLoader.style.display = "none";
              }
              formFileUploadInput.style.display = "block";
            };
            xhr.onreadystatechange = function () {
              if (
                xhr.readyState == 4 &&
                xhr.status == 200 &&
                xhr.responseText
              ) {
                try {
                  const data = JSON.parse(xhr.responseText);
                  if (data.fileUrls && data.fileUrls.length > 0) {
                    formInput.value = data.fileUrls[0];
                    if (!singlePageForm) {
                      handleNextFormStep(
                        currentPage,
                        formOptions.pages,
                        submitForm
                      );
                    }
                  }
                } catch (exp) {}

                if (uploadLoader) {
                  uploadLoader.style.display = "none";
                }
                formFileUploadInput.style.display = "block";
              }
            };
            xhr.send(formData);
          }
        });
      }
    }
    if (formItem.type === "textarea") {
      formInput.style.height = "inherit";
      formInput.style.height = formInput.scrollHeight + "px";
      formInput.addEventListener("focusin", function () {
        addDirtyFlagToFormElement(formInput);
      });
      formInput.oninput = function () {
        formInput.style.height = "inherit";
        formInput.style.height = formInput.scrollHeight + "px";
        validateFormPage(currentPage);
      };
    }
    if (formItem.type === "rating") {
      const ratingItems = document.querySelectorAll(
        `.bb-feedback-rating-${formItem.name} .bb-feedback-emojigroup li`
      );
      for (var j = 0; j < ratingItems.length; j++) {
        const ratingItem = ratingItems[j];
        ratingItem.addEventListener("click", function (e) {
          if (!ratingItem) {
            return;
          }

          formInput.value = ratingItem.getAttribute("data-value");
          validateFormPage(currentPage);

          const lastActiveItem = document.querySelector(
            `.bb-feedback-rating-${formItem.name} .bb-feedback-emojigroup li.bb-feedback-active`
          );
          if (lastActiveItem) {
            lastActiveItem.classList.remove("bb-feedback-active");
          }
          ratingItem.classList.add("bb-feedback-active");
          e.preventDefault();

          if (!singlePageForm) {
            handleNextFormStep(currentPage, formOptions.pages, submitForm);
          }
        });
      }
    }
    if (formItem.type === "onetofive") {
      const onetofiveItems = document.querySelectorAll(
        `.bb-feedback-onetofive-${formItem.name} .bb-feedback-onetofive-button`
      );
      for (var j = 0; j < onetofiveItems.length; j++) {
        const onetofiveItem = onetofiveItems[j];
        onetofiveItem.addEventListener("click", function (e) {
          if (!onetofiveItem) {
            return;
          }

          formInput.value = onetofiveItem.getAttribute("data-value");
          validateFormPage(currentPage);

          const lastActiveItem = document.querySelector(
            `.bb-feedback-onetofive-${formItem.name} .bb-feedback-onetofive-button-active`
          );
          if (lastActiveItem) {
            lastActiveItem.classList.remove(
              "bb-feedback-onetofive-button-active"
            );
          }
          onetofiveItem.classList.add("bb-feedback-onetofive-button-active");
          e.preventDefault();

          if (!singlePageForm) {
            handleNextFormStep(currentPage, formOptions.pages, submitForm);
          }
        });
      }
    }
    if (formItem.type === "multiplechoice") {
      const multiplechoiceItems = document.querySelectorAll(
        `.bb-feedback-multiplechoice-${formItem.name} .bb-feedback-multiplechoice-container`
      );
      for (var j = 0; j < multiplechoiceItems.length; j++) {
        const multiplechoiceItem = multiplechoiceItems[j];
        multiplechoiceItem.addEventListener("click", function (e) {
          if (!multiplechoiceItem) {
            return;
          }
          formInput.value = multiplechoiceItem.getAttribute("data-value");
          validateFormPage(currentPage);
        });
      }
    }

    // Validate form item initially.
    validateFormPage(currentPage, false);
  }

  // Show first page.
  showFormPage(0);
  updateFormProgressBar(0, formOptions.pages);
};

export const validateFormPage = function (page, showError = true) {
  var formValid = true;

  const formElementsToCheck = document.querySelectorAll(
    `[bb-form-page="${page}"]`
  );

  for (var i = 0; i < formElementsToCheck.length; i++) {
    const formElementToCheck = formElementsToCheck[i];
    if (formElementToCheck && formElementToCheck.getAttribute("bb-form-item")) {
      const formItem = JSON.parse(
        decodeURIComponent(formElementToCheck.getAttribute("bb-form-item"))
      );

      if (!validateFormItem(formItem, showError)) {
        formValid = false;
      }
    }
  }

  const currentNextButton = document.querySelector(
    `.bb-feedback-next-btn-${page}`
  );
  if (currentNextButton) {
    if (!formValid) {
      currentNextButton.setAttribute("disabled", "true");
      currentNextButton.classList.add("bb-feedback-send-button--disabled");
    } else {
      currentNextButton.removeAttribute("disabled");
      currentNextButton.classList.remove("bb-feedback-send-button--disabled");
    }
  }

  return formValid;
};
