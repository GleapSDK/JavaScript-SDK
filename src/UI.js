export const applyBugbattleBaseCSS = () => {
  const colorStyleSheet = `
    .bugbattle--feedback-dialog-container input, .bugbattle--feedback-dialog-container label {
      margin: 0;
      padding: 0;
      border: none;
      background-color: #fff;
    }
    
    .bugbattle--feedback-button {
      padding: 0px;
      margin: 0px;
      position: fixed;
      top: calc(50% - 58px);
      right: 0px;
      border-top-left-radius: 5px;
      border-bottom-left-radius: 5px;
      cursor: pointer;
      background-color: #398cfe;
      color: #fff;
      box-shadow: 0px 0px 8px 0px rgba(0, 0, 0, 0.15);
      z-index: 916777260;
      border: 1px solid rgba(0, 0, 0, 0.15);
      box-sizing: border-box;
    }
    
    .bugbattle--feedback-button:hover {
      box-shadow: 0px 0px 8px 0px rgba(0, 0, 0, 0.25);
    }
    
    .bugbattle--feedback-button-inner {
      position: relative;
      width: 38px;
      height: 116px;
      padding: 0px;
      margin: 0px;
      position: relative;
    }
    
    .bugbattle--feedback-button-inner-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translateX(-50%) translateY(-50%) rotate(-90deg);
      background: none;
      text-align: center;
      font-weight: bold;
      font-size: 16px;
      font-family: sans-serif;
    }
    
    .bugbattle--feedback-dialog-container {
      position: fixed;
      left: 0px;
      top: 0px;
      width: 100vw;
      height: 100vh;
      height: -webkit-fill-available;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 916777282;
      background-color: rgba(105, 117, 129, 0.5);
    }
    
    .bugbattle--feedback-dialog {
      width: 90%;
      max-width: 400px;
      background-color: #fff;
      box-shadow: 0px 5px 20px 0px rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      box-sizing: border-box;
      position: relative;
    }
    
    .bugbattle--feedback-dialog-header {
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0px 32px;
      padding-top: 50px;
      box-sizing: border-box;
      flex-direction: column;
    }
    
    .bugbattle--feedback-dialog-header-button-cancel {
      width: 26px;
      height: 26px;
      cursor: pointer;
      position: absolute;
      top: -13px;
      right: 13px;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #398cfe;
      box-shadow: 0px 5px 20px 0px rgba(0, 0, 0, 0.2);
      border-radius: 100%;
    }
    
    .bugbattle--feedback-dialog-header-button-cancel svg {
      width: 10px;
      height: 10px;
    }
    
    .bugbattle--feedback-dialog-header-button-cancel:hover svg {
      opacity: 0.6;
    }
    
    .bugbattle--feedback-dialog-header-title {
      font-weight: normal;
      text-align: center;
      color: #192027;
      font-size: 15px;
      font-family: sans-serif;
      text-align: center;
      margin-top: 32px;
      margin-bottom: 20px;
    }
    
    .bugbattle--feedback-dialog-header-logo {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .bugbattle--feedback-dialog-header-logo svg, .bugbattle--feedback-dialog-header-logo img {
      height: 40px;
      width: 100%;
      max-width: 65%;
      object-fit: contain;
      text-align: center;
    }

    .bugbattle--feedback-types {
      margin: 40px 0px;
      border-top: 1px solid #e9f1fd;
    }
    
    .bugbattle--feedback-type {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      padding: 20px;
      cursor: pointer;
      border-bottom: 1px solid #e9f1fd;
    }

    .bugbattle--feedback-type:hover {
      background-color: #e9f1fd;
    }

    .bugbattle--feedback-type-icon {
      width: 44px;
      height: 44px;
      background-color: #398cfe;
      border-radius: 44px;
      margin-right: 20px;
      padding: 10px;
    }

    .bugbattle--feedback-type-text {
      flex-grow: 1;
    }
    
    .bugbattle--feedback-type-title {
      font-weight: bold;
      font-size: 16px;
    }
    
    .bugbattle--feedback-type-description {
      color: #666;
      font-size: 15px;
      font-family: sans-serif;
    }
    
    .bugbattle--feedback-dialog-info-text {
      color: #666;
      font-size: 16px;
      font-family: sans-serif;
      padding-top: 20px;
      text-align: center;
    }
    
    .bugbattle--feedback-dialog-success {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      padding: 50px;
      display: none;
    }
    
    .bugbattle--feedback-dialog-success svg {
      width: 30px;
      height: auto;
    }
    
    .bugbattle--feedback-dialog-loading {
      display: none;
    }
    
    .bugbattle--feedback-dialog-body {
      display: block;
    }
    
    .bugbattle--feedback-inputgroup {
      display: flex;
      justify-content: center;
      margin-bottom: 10px;
      padding: 0px 32px;
      flex-direction: column;
    }
    
    .bugbattle--feedback-inputgroup-button {
      display: flex;
      align-items: center;
    }
    
    .bugbattle--feedback-inputgroup-text {
      color: #192027;
      font-size: 16px;
      font-weight: normal;
      font-family: sans-serif;
    }
    
    .bugbattle--feedback-inputgroup-label {
      padding: 0px;
      margin-bottom: 5px;
      color: #192027;
      font-size: 14px;
      font-weight: 600;
      font-family: sans-serif;
    }
    
    .bugbattle--feedback-send-button {
      background-color: #398cfe;
      border-radius: 8px;
      box-sizing: border-box;
      padding: 10px 19px;
      font-size: 16px;
      font-weight: bold;
      font-family: sans-serif;
      color: #fff;
      text-align: center;
      width: auto;
      margin-top: 5px;
      margin-bottom: 20px;
      cursor: pointer;
      box-shadow: 0px 5px 10px 0px rgba(0, 0, 0, 0.15);
    }
    
    .bugbattle--feedback-send-button:hover {
      opacity: 0.9;
    }
    
    .bugbattle--feedback-inputgroup>input, .bugbattle--feedback-inputgroup input {
      width: auto;
      padding: 15px 12px;
      font-size: 15px;
      font-family: sans-serif;
      outline: none;
      border: 1px solid #e9f1fd;
      background-color: #fafbfd;
      border-radius: 8px;
      box-sizing: border-box;
    }

    .bugbattle--feedback-inputgroup>input.bugbattle--feedback-required, .bugbattle--feedback-inputgroup input.bugbattle--feedback-required {
      border: 1px solid #da0e07;
      background-color: #da0e0710;
    }
    
    .bugbattle--feedback-inputgroup textarea {
      outline: none;
      -webkit-box-shadow: none;
      -moz-box-shadow: none;
      box-shadow: none;
      resize: none;
      width: auto;
      padding: 12px;
      font-size: 15px;
      line-height: 17px;
      font-family: sans-serif;
      margin: 0px;
      box-sizing: border-box;
      border: 1px solid #e9f1fd;
      background-color: #fafbfd;
      border-radius: 8px;
      box-sizing: border-box;
    }
    
    .bugbattle--feedback-inputgroup--privacy-policy {
      padding: 8px 32px;
      font-family: sans-serif;
      font-size: 14px;
      flex-direction: row;
      width: 100%;
      justify-content: flex-start;
      align-items: center;
    }
    
    .bugbattle--feedback-inputgroup--privacy-policy-label {
      cursor: pointer;
      align-items: center;
      margin-left: 10px;
    }
    
    .bugbattle--feedback-inputgroup--privacy-policy a {
      color: #398cfe;
      margin-top: 0px;
      margin-bottom: 0px;
      display: inline;
    }
    
    .bugbattle--feedback-inputgroup--privacy-policy input {
      width: auto;
      border: none;
      font-size: 15px;
      font-family: sans-serif;
      outline: none;
    }
    
    .bugbattle-feedback-importance {
      margin: 20px;
      margin-bottom: -8px;
      font-weight: bold;
      color: #222426;
      font-size: 14px;
      font-family: sans-serif;
    }
    
    .bugbattle--feedback-image {
      position: relative;
    }
    
    .bugbattle--feedback-poweredbycontainer {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-top: 0px;
      margin-bottom: 32px;
      cursor: pointer;
    }
    
    .bugbattle--feedback-poweredbycontainer span {
      font-weight: normal;
      font-size: 14px;
      font-family: sans-serif;
      color: #aaa;
    }
    
    .bugbattle--feedback-poweredbycontainer svg {
      height: 18px;
      width: auto;
      margin-left: 5px;
    }
    
    .bugbattle--edit-button {
      position: absolute;
      top: calc(50% - 25px);
      left: 100px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background-color: rgba(0, 0, 0, 0.45);
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .bugbattle--feedback-dialog-loading {
      padding: 20px;
      display: none;
      justify-content: center;
      align-items: center;
    }

    .bugbattle--progress-ring__circle {
      transition: 0.35s stroke-dashoffset;
      transform: rotate(-90deg);
      transform-origin: 50% 50%;
    }
    
    .bugbattle--edit-button svg {
      width: 60%;
    }
    
    .bugbattle-screenshot-editor-container {
      position: fixed;
      top: 0px;
      left: 0px;
      width: 100vw;
      height: 100vh;
      height: -webkit-fill-available;
      z-index: 916777263;
    }
    
    .bugbattle-screenshot-editor-container-inner {
      position: relative;
      width: 100vw;
      height: 100vh;
      height: -webkit-fill-available;
    }
    
    .bugbattle-screenshot-editor-canvas {
      position: absolute;
      top: 0px;
      left: 0px;
      width: 100vw;
      height: 100vh;
      height: -webkit-fill-available;
      cursor: crosshair;
      z-index: 916777267;
    }
    
    .bugbattle-screenshot-editor-borderlayer {
      position: absolute;
      top: 0px;
      left: 0px;
      width: 100vw;
      height: 100vh;
      height: -webkit-fill-available;
      border: 12px solid #398cfe;
      cursor: crosshair;
      z-index: 916777272;
      box-sizing: border-box;
    }
    
    .bugbattle-screenshot-editor-dot {
      position: absolute;
      top: -16px;
      left: -16px;
      width: 16px;
      height: 16px;
      background-color: #398cfe;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 100%;
      box-shadow: 0px 0px 8px 0px rgba(0, 0, 0, 0.15);
      z-index: 916777270;
      box-sizing: border-box;
    }
    
    .bugbattle-screenshot-editor-drag-info {
      position: absolute;
      top: -100px;
      left: -100px;
      background-color: #398cfe;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 5px;
      box-sizing: border-box;
      padding: 8px 10px;
      font-size: 16px;
      font-family: sans-serif;
      color: #fff;
      box-shadow: 0px 0px 8px 0px rgba(0, 0, 0, 0.15);
      z-index: 916777271;
      min-width: 270px;
      text-align: center;
    }
    
    .bugbattle-screenshot-editor-rectangle {
      position: absolute;
      top: 0px;
      left: 0px;
      width: 0px;
      height: 0px;
      border: 5px solid #398cfe;
      box-sizing: border-box;
      z-index: 916777269;
    }
    
    @media only screen and (max-width: 600px) {
      .bugbattle--feedback-dialog {
        width: 100%;
        border-radius: 0px;
        box-sizing: border-box;
        max-width: inherit;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
      }
      .bugbattle--feedback-dialog-header {
        border-radius: 0px;
      }
      .bugbattle--feedback-button-inner {
        width: 32px;
        height: 100px;
      }
      .bugbattle--feedback-button-inner-text {
        font-size: 15px;
      }
      .bugbattle-screenshot-editor-drag-info {
        position: absolute;
        top: 20px;
        left: 20px;
        right: 20px;
      }
      .bugbattle-screenshot-editor-borderlayer {
        border-width: 5px;
      }  
    }
    `;

  const node = document.createElement("style");
  node.innerHTML = colorStyleSheet;
  document.body.appendChild(node);
};

export const setColor = (color) => {
  const colorStyleSheet = `
    .bugbattle--feedback-button {
        background-color: ${color};
    }
    .bugbattle--feedback-dialog-header-button {
        color: ${color};
    }
    .bugbattle-screenshot-editor-borderlayer {
        border-color: ${color};
    }
    .bugbattle-screenshot-editor-dot {
      background-color: ${color};
    }
    .bugbattle-screenshot-editor-rectangle {
      border-color: ${color};
    }
    .bugbattle--feedback-send-button {
      background-color: ${color};
    }
    .bugbattle--feedback-inputgroup--privacy-policy a {
      color: ${color};
    }
    .bugbattle-screenshot-editor-drag-info {
      background-color: ${color};
    }
    .bugbattle-double-bounce1,
    .bugbattle-double-bounce2 {
      background-color: ${color};
    }
    .bugbattle--feedback-dialog-header-button-cancel {
      background-color: ${color};
    }
    .bugbattle--feedback-type-icon {
      background-color: ${color};
    }
    `;

  const node = document.createElement("style");
  node.innerHTML = colorStyleSheet;
  document.body.appendChild(node);
};
