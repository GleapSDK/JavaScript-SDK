import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';
import { GleapSession } from './Gleap';

export default class GleapTooltipManager {
    tooltips = [];
    tippyInstances = {};
    nextId = 0;

    // GleapTooltipManager singleton
    static instance;
    static getInstance() {
        if (!this.instance) {
            this.instance = new GleapTooltipManager();
        }
        return this.instance;
    }

    linkTooltip = (element, tooltip) => {
        if (element.hasAttribute('data-gleap-tooltip')) {
            return;
        }

        const nextId = this.nextId++;
        element.setAttribute('data-gleap-tooltip', nextId);
        if (element) {
            var tooltipElem = null;

            if (tooltip.mode === 'hotspot') {
                // Create hotspot.
                const hotspot = document.createElement('div');
                hotspot.style.position = 'absolute';
                hotspot.style.width = '22px';
                hotspot.style.height = '22px';
                hotspot.style.backgroundColor = 'red';
                hotspot.style.borderRadius = '22px';
                hotspot.style.cursor = 'pointer';
                hotspot.style.top = '50%';
                hotspot.style.left = '100%';
                hotspot.style.transform = 'translate(-50%, -50%)';
                hotspot.style.zIndex = '9999';
                hotspot.style.display = 'block';
                hotspot.style.pointerEvents = 'all';

                element.parentNode.insertBefore(hotspot, element.nextSibling);

                // Make element position relative.
                element.parentNode.style.position = 'relative';

                tooltipElem = hotspot;
            } else {
                // Create tooltip.
                tooltipElem = element;
            }

            const tippyInstance = tippy(tooltipElem, {
                content: tooltip.html,
                allowHTML: true,
                interactive: true,
                theme: 'light',
            });

            this.tippyInstances[nextId] = tippyInstance;
        }
    }

    createTooltips = () => {
        for (let i = 0; i < this.tooltips.length; i++) {
            const tooltip = this.tooltips[i];
            const elements = document.querySelectorAll(tooltip.selector);

            for (let j = 0; j < elements.length; j++) {
                const element = elements[j];

                if (element) {
                    this.linkTooltip(element, tooltip);
                }
            }
        }
    }

    load = () => {
        const self = this;
        const sessionInstance = GleapSession.getInstance();

        const http = new XMLHttpRequest();
        http.open("GET", sessionInstance.apiUrl + "/config/" + sessionInstance.sdkKey + "/tooltips");
        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        http.setRequestHeader("Api-Token", sessionInstance.sdkKey);
        try {
            http.setRequestHeader("Gleap-Id", sessionInstance.session.gleapId);
            http.setRequestHeader("Gleap-Hash", sessionInstance.session.gleapHash);
        } catch (exp) { }

        http.onerror = () => {
            console.error("Failed to fetch tooltips");
        };
        http.onreadystatechange = function (e) {
            if (http.readyState === 4) {
                if (http.status === 200) {
                    try {
                        self.tooltips = JSON.parse(http.responseText);
                        self.createTooltips();
                    } catch (exp) {
                        console.error("Failed to parse tooltips", exp);
                    }
                }
            }
        };

        http.send();
    };
}