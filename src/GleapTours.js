const GleapTours = function () {
    "use strict";
    let currentConfig = {};
    function configure(config = {}) {
        currentConfig = {
            animate: true,
            allowClose: true,
            overlayOpacity: 0.7,
            smoothScroll: false,
            disableActiveInteraction: false,
            showProgress: false,
            stagePadding: 10,
            stageRadius: 5,
            popoverOffset: 10,
            showButtons: ["next", "previous", "close"],
            disableButtons: [],
            overlayColor: "#000",
            ...config
        };
    }
    function getConfig(key) {
        return key ? currentConfig[key] : currentConfig;
    }
    function easeInOutQuad(elapsed, initialValue, amountOfChange, duration) {
        if ((elapsed /= duration / 2) < 1) {
            return amountOfChange / 2 * elapsed * elapsed + initialValue;
        }
        return -amountOfChange / 2 * (--elapsed * (elapsed - 2) - 1) + initialValue;
    }
    function getFocusableElements(parentEls) {
        const focusableQuery = 'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])';
        return parentEls.flatMap((parentEl) => {
            const isParentFocusable = parentEl.matches(focusableQuery);
            const focusableEls = Array.from(parentEl.querySelectorAll(focusableQuery));
            return [...isParentFocusable ? [parentEl] : [], ...focusableEls];
        }).filter((el) => {
            return getComputedStyle(el).pointerEvents !== "none" && isElementVisible(el);
        });
    }
    function bringInView(element) {
        if (!element || isElementInView(element)) {
            return;
        }
        const shouldSmoothScroll = getConfig("smoothScroll");
        element.scrollIntoView({
            // Removing the smooth scrolling for elements which exist inside the scrollable parent
            // This was causing the highlight to not properly render
            behavior: !shouldSmoothScroll || hasScrollableParent(element) ? "auto" : "smooth",
            inline: "center",
            block: "center"
        });
    }
    function hasScrollableParent(e) {
        if (!e || !e.parentElement) {
            return;
        }
        const parent = e.parentElement;
        return parent.scrollHeight > parent.clientHeight;
    }
    function isElementInView(element) {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth);
    }
    function isElementVisible(el) {
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }
    let currentState = {};
    function setState(key, value) {
        currentState[key] = value;
    }
    function getState(key) {
        return key ? currentState[key] : currentState;
    }
    function resetState() {
        currentState = {};
    }
    let registeredListeners = {};
    function listen(hook, callback) {
        registeredListeners[hook] = callback;
    }
    function emit(hook) {
        var _a;
        (_a = registeredListeners[hook]) == null ? void 0 : _a.call(registeredListeners);
    }
    function destroyEmitter() {
        registeredListeners = {};
    }
    function transitionStage(elapsed, duration, from, to) {
        let activeStagePosition = getState("__activeStagePosition");
        const fromDefinition = activeStagePosition ? activeStagePosition : from.getBoundingClientRect();
        const toDefinition = to.getBoundingClientRect();
        const x = easeInOutQuad(elapsed, fromDefinition.x, toDefinition.x - fromDefinition.x, duration);
        const y = easeInOutQuad(elapsed, fromDefinition.y, toDefinition.y - fromDefinition.y, duration);
        const width = easeInOutQuad(elapsed, fromDefinition.width, toDefinition.width - fromDefinition.width, duration);
        const height = easeInOutQuad(elapsed, fromDefinition.height, toDefinition.height - fromDefinition.height, duration);
        activeStagePosition = {
            x,
            y,
            width,
            height
        };
        renderOverlay(activeStagePosition);
        setState("__activeStagePosition", activeStagePosition);
    }
    function trackActiveElement(element) {
        if (!element) {
            return;
        }
        const definition = element.getBoundingClientRect();
        const activeStagePosition = {
            x: definition.x,
            y: definition.y,
            width: definition.width,
            height: definition.height
        };
        setState("__activeStagePosition", activeStagePosition);
        renderOverlay(activeStagePosition);
    }
    function refreshOverlay() {
        const activeStagePosition = getState("__activeStagePosition");
        const overlaySvg = getState("__overlaySvg");
        if (!activeStagePosition) {
            return;
        }
        if (!overlaySvg) {
            console.warn("No stage svg found.");
            return;
        }
        const windowX = window.innerWidth;
        const windowY = window.innerHeight;
        overlaySvg.setAttribute("viewBox", `0 0 ${windowX} ${windowY}`);
    }
    function mountOverlay(stagePosition) {
        const overlaySvg = createOverlaySvg(stagePosition);
        document.body.appendChild(overlaySvg);
        onDriverClick(overlaySvg, (e) => {
            const target = e.target;
            if (target.tagName !== "path") {
                return;
            }
            emit("overlayClick");
        });
        setState("__overlaySvg", overlaySvg);
    }
    function renderOverlay(stagePosition) {
        const overlaySvg = getState("__overlaySvg");
        if (!overlaySvg) {
            mountOverlay(stagePosition);
            return;
        }
        const pathElement = overlaySvg.firstElementChild;
        if ((pathElement == null ? void 0 : pathElement.tagName) !== "path") {
            throw new Error("no path element found in stage svg");
        }
        pathElement.setAttribute("d", generateStageSvgPathString(stagePosition));
    }
    function createOverlaySvg(stage) {
        const windowX = window.innerWidth;
        const windowY = window.innerHeight;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add("gleap-tour-overlay", "gleap-tour-overlay-animated");
        svg.setAttribute("viewBox", `0 0 ${windowX} ${windowY}`);
        svg.setAttribute("xmlSpace", "preserve");
        svg.setAttribute("xmlnsXlink", "http://www.w3.org/1999/xlink");
        svg.setAttribute("version", "1.1");
        svg.setAttribute("preserveAspectRatio", "xMinYMin slice");
        svg.style.fillRule = "evenodd";
        svg.style.clipRule = "evenodd";
        svg.style.strokeLinejoin = "round";
        svg.style.strokeMiterlimit = "2";
        svg.style.zIndex = "10000";
        svg.style.position = "fixed";
        svg.style.top = "0";
        svg.style.left = "0";
        svg.style.width = "100%";
        svg.style.height = "100%";
        const stagePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        stagePath.setAttribute("d", generateStageSvgPathString(stage));
        stagePath.style.fill = getConfig("overlayColor") || "rgb(0,0,0)";
        stagePath.style.opacity = `${getConfig("overlayOpacity")}`;
        stagePath.style.pointerEvents = "auto";
        stagePath.style.cursor = "auto";
        svg.appendChild(stagePath);
        return svg;
    }
    function generateStageSvgPathString(stage) {
        const windowX = window.innerWidth;
        const windowY = window.innerHeight;
        const stagePadding = getConfig("stagePadding") || 0;
        const stageRadius = getConfig("stageRadius") || 0;
        const stageWidth = stage.width + stagePadding * 2;
        const stageHeight = stage.height + stagePadding * 2;
        const limitedRadius = Math.min(stageRadius, stageWidth / 2, stageHeight / 2);
        const normalizedRadius = Math.floor(Math.max(limitedRadius, 0));
        const highlightBoxX = stage.x - stagePadding + normalizedRadius;
        const highlightBoxY = stage.y - stagePadding;
        const highlightBoxWidth = stageWidth - normalizedRadius * 2;
        const highlightBoxHeight = stageHeight - normalizedRadius * 2;
        return `M${windowX},0L0,0L0,${windowY}L${windowX},${windowY}L${windowX},0Z
    M${highlightBoxX},${highlightBoxY} h${highlightBoxWidth} a${normalizedRadius},${normalizedRadius} 0 0 1 ${normalizedRadius},${normalizedRadius} v${highlightBoxHeight} a${normalizedRadius},${normalizedRadius} 0 0 1 -${normalizedRadius},${normalizedRadius} h-${highlightBoxWidth} a${normalizedRadius},${normalizedRadius} 0 0 1 -${normalizedRadius},-${normalizedRadius} v-${highlightBoxHeight} a${normalizedRadius},${normalizedRadius} 0 0 1 ${normalizedRadius},-${normalizedRadius} z`;
    }
    function destroyOverlay() {
        const overlaySvg = getState("__overlaySvg");
        if (overlaySvg) {
            overlaySvg.remove();
        }
    }
    function mountDummyElement() {
        const existingDummy = document.getElementById("gleap-tour-dummy-element");
        if (existingDummy) {
            return existingDummy;
        }
        let element = document.createElement("div");
        element.id = "gleap-tour-dummy-element";
        element.style.width = "0";
        element.style.height = "0";
        element.style.pointerEvents = "none";
        element.style.opacity = "0";
        element.style.position = "fixed";
        element.style.top = "50%";
        element.style.left = "50%";
        document.body.appendChild(element);
        return element;
    }
    function highlight(step, attemptTime = 2000) {
        const { element } = step;
        let elemObj = typeof element === "string" ? document.querySelector(element) : element;

        if (element && !elemObj && attemptTime >= 0) {
            setTimeout(() => {
                hidePopover();
                highlight(step, attemptTime - 100);
            }, 100);

            return;
        }

        if (!elemObj) {
            elemObj = mountDummyElement();
        }

        transferHighlight(elemObj, step);
    }
    function refreshActiveHighlight() {
        const activeHighlight = getState("__activeElement");
        const activeStep = getState("__activeStep");
        if (!activeHighlight) {
            return;
        }
        trackActiveElement(activeHighlight);
        refreshOverlay();
        repositionPopover(activeHighlight, activeStep);
    }
    function transferHighlight(toElement, toStep) {
        const duration = 400;
        const start = Date.now();
        const fromStep = getState("__activeStep");
        const fromElement = getState("__activeElement") || toElement;
        const isFirstHighlight = !fromElement || fromElement === toElement;
        const isToDummyElement = toElement.id === "gleap-tour-dummy-element";
        const isFromDummyElement = fromElement.id === "gleap-tour-dummy-element";
        const isAnimatedTour = getConfig("animate");
        const highlightStartedHook = toStep.onHighlightStarted || getConfig("onHighlightStarted");
        const highlightedHook = (toStep == null ? void 0 : toStep.onHighlighted) || getConfig("onHighlighted");
        const deselectedHook = (fromStep == null ? void 0 : fromStep.onDeselected) || getConfig("onDeselected");
        const config = getConfig();
        const state = getState();
        if (!isFirstHighlight && deselectedHook) {
            deselectedHook(isFromDummyElement ? void 0 : fromElement, fromStep, {
                config,
                state
            });
        }
        if (highlightStartedHook) {
            highlightStartedHook(isToDummyElement ? void 0 : toElement, toStep, {
                config,
                state
            });
        }
        const hasDelayedPopover = !isFirstHighlight && isAnimatedTour;
        let isPopoverRendered = false;
        hidePopover();
        setState("previousStep", fromStep);
        setState("previousElement", fromElement);
        setState("activeStep", toStep);
        setState("activeElement", toElement);
        const animate = () => {
            const transitionCallback = getState("__transitionCallback");
            if (transitionCallback !== animate) {
                return;
            }
            const elapsed = Date.now() - start;
            const timeRemaining = duration - elapsed;
            const isHalfwayThrough = timeRemaining <= duration / 2;
            if (toStep.popover && isHalfwayThrough && !isPopoverRendered && hasDelayedPopover) {
                renderPopover(toElement, toStep);
                isPopoverRendered = true;
            }
            if (getConfig("animate") && elapsed < duration) {
                transitionStage(elapsed, duration, fromElement, toElement);
            } else {
                trackActiveElement(toElement);
                if (highlightedHook) {
                    highlightedHook(isToDummyElement ? void 0 : toElement, toStep, {
                        config: getConfig(),
                        state: getState()
                    });
                }
                setState("__transitionCallback", void 0);
                setState("__previousStep", fromStep);
                setState("__previousElement", fromElement);
                setState("__activeStep", toStep);
                setState("__activeElement", toElement);
            }
            window.requestAnimationFrame(animate);
        };
        setState("__transitionCallback", animate);
        window.requestAnimationFrame(animate);
        bringInView(toElement);
        if (!hasDelayedPopover && toStep.popover) {
            renderPopover(toElement, toStep);
        }
        fromElement.classList.remove("gleap-tour-active-element", "gleap-tour-no-interaction");
        fromElement.removeAttribute("aria-haspopup");
        fromElement.removeAttribute("aria-expanded");
        fromElement.removeAttribute("aria-controls");
        const disableActiveInteraction = toStep.disableActiveInteraction ?? getConfig("disableActiveInteraction") ?? false;
        if (disableActiveInteraction) {
            toElement.classList.add("gleap-tour-no-interaction");
        }
        toElement.classList.add("gleap-tour-active-element");
        toElement.setAttribute("aria-haspopup", "dialog");
        toElement.setAttribute("aria-expanded", "true");
        toElement.setAttribute("aria-controls", "gleap-tour-popover-content");
    }
    function destroyHighlight() {
        var _a;
        (_a = document.getElementById("gleap-tour-dummy-element")) == null ? void 0 : _a.remove();
        document.querySelectorAll(".gleap-tour-active-element").forEach((element) => {
            element.classList.remove("gleap-tour-active-element", "gleap-tour-no-interaction");
            element.removeAttribute("aria-haspopup");
            element.removeAttribute("aria-expanded");
            element.removeAttribute("aria-controls");
        });
    }
    function requireRefresh() {
        const resizeTimeout = getState("__resizeTimeout");
        if (resizeTimeout) {
            window.cancelAnimationFrame(resizeTimeout);
        }
        setState("__resizeTimeout", window.requestAnimationFrame(refreshActiveHighlight));
    }
    function trapFocus(e) {
        var _a;
        const isActivated = getState("isInitialized");
        if (!isActivated) {
            return;
        }
        const isTabKey = e.key === "Tab" || e.keyCode === 9;
        if (!isTabKey) {
            return;
        }
        const activeElement = getState("__activeElement");
        const popoverEl = (_a = getState("popover")) == null ? void 0 : _a.wrapper;
        const focusableEls = getFocusableElements([
            ...popoverEl ? [popoverEl] : [],
            ...activeElement ? [activeElement] : []
        ]);
        const firstFocusableEl = focusableEls[0];
        const lastFocusableEl = focusableEls[focusableEls.length - 1];
        e.preventDefault();
        if (e.shiftKey) {
            const previousFocusableEl = focusableEls[focusableEls.indexOf(document.activeElement) - 1] || lastFocusableEl;
            previousFocusableEl == null ? void 0 : previousFocusableEl.focus();
        } else {
            const nextFocusableEl = focusableEls[focusableEls.indexOf(document.activeElement) + 1] || firstFocusableEl;
            nextFocusableEl == null ? void 0 : nextFocusableEl.focus();
        }
    }
    function onKeyup(e) {
        var _a;
        const allowKeyboardControl = (_a = getConfig("allowKeyboardControl")) != null ? _a : true;
        if (!allowKeyboardControl) {
            return;
        }
        if (e.key === "Escape") {
            emit("escapePress");
        } else if (e.key === "ArrowRight") {
            emit("arrowRightPress");
        } else if (e.key === "ArrowLeft") {
            emit("arrowLeftPress");
        }
    }
    function onDriverClick(element, listener, shouldPreventDefault) {
        const listenerWrapper = (e, listener2) => {
            const target = e.target;
            if (!element.contains(target)) {
                return;
            }
            if (!shouldPreventDefault || shouldPreventDefault(target)) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
            listener2 == null ? void 0 : listener2(e);
        };
        const useCapture = true;
        document.addEventListener("pointerdown", listenerWrapper, useCapture);
        document.addEventListener("mousedown", listenerWrapper, useCapture);
        document.addEventListener("pointerup", listenerWrapper, useCapture);
        document.addEventListener("mouseup", listenerWrapper, useCapture);
        document.addEventListener(
            "click",
            (e) => {
                listenerWrapper(e, listener);
            },
            useCapture
        );
    }
    function initEvents() {
        window.addEventListener("keyup", onKeyup, false);
        window.addEventListener("keydown", trapFocus, false);
        window.addEventListener("resize", requireRefresh);
        window.addEventListener("scroll", requireRefresh);
    }
    function destroyEvents() {
        window.removeEventListener("keyup", onKeyup);
        window.removeEventListener("resize", requireRefresh);
        window.removeEventListener("scroll", requireRefresh);
    }
    function hidePopover() {
        const popover = getState("popover");
        if (!popover) {
            return;
        }
        popover.wrapper.style.display = "none";
    }
    function renderPopover(element, step) {
        var _a, _b;
        let popover = getState("popover");
        if (popover) {
            document.body.removeChild(popover.wrapper);
        }
        popover = createPopover();
        document.body.appendChild(popover.wrapper);
        const {
            title,
            description,
            showButtons,
            disableButtons,
            showProgress,
            nextBtnText = getConfig("nextBtnText") || "Next",
            prevBtnText = getConfig("prevBtnText") || "Previous",
            progressText = getConfig("progressText") || "{current} of {total}"
        } = step.popover || {};
        popover.nextButton.innerHTML = nextBtnText;
        popover.previousButton.innerHTML = prevBtnText;
        popover.progress.innerHTML = progressText;
        if (title) {
            popover.title.innerHTML = title;
            popover.title.style.display = "block";
        } else {
            popover.title.style.display = "none";
        }
        if (description) {
            popover.description.innerHTML = description;
            popover.description.style.display = "block";
        } else {
            popover.description.style.display = "none";
        }
        const showButtonsConfig = showButtons || getConfig("showButtons");
        const showProgressConfig = showProgress || getConfig("showProgress") || false;
        const showFooter = (showButtonsConfig == null ? void 0 : showButtonsConfig.includes("next")) || (showButtonsConfig == null ? void 0 : showButtonsConfig.includes("previous")) || showProgressConfig;
        popover.closeButton.style.display = showButtonsConfig.includes("close") ? "block" : "none";
        if (showFooter) {
            popover.footer.style.display = "flex";
            popover.progress.style.display = showProgressConfig ? "block" : "none";
            popover.nextButton.style.display = showButtonsConfig.includes("next") ? "block" : "none";
            popover.previousButton.style.display = showButtonsConfig.includes("previous") ? "block" : "none";
        } else {
            popover.footer.style.display = "none";
        }
        const disabledButtonsConfig = disableButtons || getConfig("disableButtons") || [];
        if (disabledButtonsConfig == null ? void 0 : disabledButtonsConfig.includes("next")) {
            popover.nextButton.disabled = true;
            popover.nextButton.classList.add("gleap-tour-popover-btn-disabled");
        }
        if (disabledButtonsConfig == null ? void 0 : disabledButtonsConfig.includes("previous")) {
            popover.previousButton.disabled = true;
            popover.previousButton.classList.add("gleap-tour-popover-btn-disabled");
        }
        if (disabledButtonsConfig == null ? void 0 : disabledButtonsConfig.includes("close")) {
            popover.closeButton.disabled = true;
            popover.closeButton.classList.add("gleap-tour-popover-btn-disabled");
        }
        const popoverWrapper = popover.wrapper;
        popoverWrapper.style.display = "block";
        popoverWrapper.style.left = "";
        popoverWrapper.style.top = "";
        popoverWrapper.style.bottom = "";
        popoverWrapper.style.right = "";
        popoverWrapper.id = "gleap-tour-popover-content";
        popoverWrapper.setAttribute("role", "dialog");
        popoverWrapper.setAttribute("aria-labelledby", "gleap-tour-popover-title");
        popoverWrapper.setAttribute("aria-describedby", "gleap-tour-popover-description");
        const popoverArrow = popover.arrow;
        popoverArrow.className = "gleap-tour-popover-arrow";
        const customPopoverClass = ((_a = step.popover) == null ? void 0 : _a.popoverClass) || getConfig("popoverClass") || "";
        popoverWrapper.className = `gleap-tour-popover ${customPopoverClass}`.trim();
        onDriverClick(
            popover.wrapper,
            (e) => {
                var _a2, _b2, _c;
                const target = e.target;
                const onNextClick = ((_a2 = step.popover) == null ? void 0 : _a2.onNextClick) || getConfig("onNextClick");
                const onPrevClick = ((_b2 = step.popover) == null ? void 0 : _b2.onPrevClick) || getConfig("onPrevClick");
                const onCloseClick = ((_c = step.popover) == null ? void 0 : _c.onCloseClick) || getConfig("onCloseClick");
                if (target.classList.contains("gleap-tour-popover-next-btn")) {
                    if (onNextClick) {
                        return onNextClick(element, step, {
                            config: getConfig(),
                            state: getState()
                        });
                    } else {
                        return emit("nextClick");
                    }
                }
                if (target.classList.contains("gleap-tour-popover-prev-btn")) {
                    if (onPrevClick) {
                        return onPrevClick(element, step, {
                            config: getConfig(),
                            state: getState()
                        });
                    } else {
                        return emit("prevClick");
                    }
                }
                if (target.classList.contains("gleap-tour-popover-close-btn")) {
                    if (onCloseClick) {
                        return onCloseClick(element, step, {
                            config: getConfig(),
                            state: getState()
                        });
                    } else {
                        return emit("closeClick");
                    }
                }
                return void 0;
            },
            (target) => {
                return !(popover == null ? void 0 : popover.description.contains(target)) && !(popover == null ? void 0 : popover.title.contains(target)) && typeof target.className === "string" && target.className.includes("gleap-tour-popover");
            }
        );
        setState("popover", popover);
        const onPopoverRender = ((_b = step.popover) == null ? void 0 : _b.onPopoverRender) || getConfig("onPopoverRender");
        if (onPopoverRender) {
            onPopoverRender(popover, {
                config: getConfig(),
                state: getState()
            });
        }
        repositionPopover(element, step);
        bringInView(popoverWrapper);
        const isToDummyElement = element.classList.contains("gleap-tour-dummy-element");
        const focusableElement = getFocusableElements([popoverWrapper, ...isToDummyElement ? [] : [element]]);
        if (focusableElement.length > 0) {
            focusableElement[0].focus();
        }
    }
    function getPopoverDimensions() {
        const popover = getState("popover");
        if (!(popover == null ? void 0 : popover.wrapper)) {
            return;
        }
        const boundingClientRect = popover.wrapper.getBoundingClientRect();
        const stagePadding = getConfig("stagePadding") || 0;
        const popoverOffset = getConfig("popoverOffset") || 0;
        return {
            width: boundingClientRect.width + stagePadding + popoverOffset,
            height: boundingClientRect.height + stagePadding + popoverOffset,
            realWidth: boundingClientRect.width,
            realHeight: boundingClientRect.height
        };
    }
    function calculateTopForLeftRight(alignment, config) {
        const { elementDimensions, popoverDimensions, popoverPadding, popoverArrowDimensions } = config;
        if (alignment === "start") {
            return Math.max(
                Math.min(
                    elementDimensions.top - popoverPadding,
                    window.innerHeight - popoverDimensions.realHeight - popoverArrowDimensions.width
                ),
                popoverArrowDimensions.width
            );
        }
        if (alignment === "end") {
            return Math.max(
                Math.min(
                    elementDimensions.top - (popoverDimensions == null ? void 0 : popoverDimensions.realHeight) + elementDimensions.height + popoverPadding,
                    window.innerHeight - (popoverDimensions == null ? void 0 : popoverDimensions.realHeight) - popoverArrowDimensions.width
                ),
                popoverArrowDimensions.width
            );
        }
        if (alignment === "center") {
            return Math.max(
                Math.min(
                    elementDimensions.top + elementDimensions.height / 2 - (popoverDimensions == null ? void 0 : popoverDimensions.realHeight) / 2,
                    window.innerHeight - (popoverDimensions == null ? void 0 : popoverDimensions.realHeight) - popoverArrowDimensions.width
                ),
                popoverArrowDimensions.width
            );
        }
        return 0;
    }
    function calculateLeftForTopBottom(alignment, config) {
        const { elementDimensions, popoverDimensions, popoverPadding, popoverArrowDimensions } = config;
        if (alignment === "start") {
            return Math.max(
                Math.min(
                    elementDimensions.left - popoverPadding,
                    window.innerWidth - popoverDimensions.realWidth - popoverArrowDimensions.width
                ),
                popoverArrowDimensions.width
            );
        }
        if (alignment === "end") {
            return Math.max(
                Math.min(
                    elementDimensions.left - (popoverDimensions == null ? void 0 : popoverDimensions.realWidth) + elementDimensions.width + popoverPadding,
                    window.innerWidth - (popoverDimensions == null ? void 0 : popoverDimensions.realWidth) - popoverArrowDimensions.width
                ),
                popoverArrowDimensions.width
            );
        }
        if (alignment === "center") {
            return Math.max(
                Math.min(
                    elementDimensions.left + elementDimensions.width / 2 - (popoverDimensions == null ? void 0 : popoverDimensions.realWidth) / 2,
                    window.innerWidth - (popoverDimensions == null ? void 0 : popoverDimensions.realWidth) - popoverArrowDimensions.width
                ),
                popoverArrowDimensions.width
            );
        }
        return 0;
    }
    function repositionPopover(element, step) {
        const popover = getState("popover");
        if (!popover) {
            return;
        }
        const { align = "start", side = "left" } = (step == null ? void 0 : step.popover) || {};
        const requiredAlignment = align;
        const requiredSide = element.id === "gleap-tour-dummy-element" ? "over" : side;
        const popoverPadding = getConfig("stagePadding") || 0;
        const popoverDimensions = getPopoverDimensions();
        const popoverArrowDimensions = popover.arrow.getBoundingClientRect();
        const elementDimensions = element.getBoundingClientRect();
        const topValue = elementDimensions.top - popoverDimensions.height;
        let isTopOptimal = topValue >= 0;
        const bottomValue = window.innerHeight - (elementDimensions.bottom + popoverDimensions.height);
        let isBottomOptimal = bottomValue >= 0;
        const leftValue = elementDimensions.left - popoverDimensions.width;
        let isLeftOptimal = leftValue >= 0;
        const rightValue = window.innerWidth - (elementDimensions.right + popoverDimensions.width);
        let isRightOptimal = rightValue >= 0;
        const noneOptimal = !isTopOptimal && !isBottomOptimal && !isLeftOptimal && !isRightOptimal;
        let popoverRenderedSide = requiredSide;
        if (requiredSide === "top" && isTopOptimal) {
            isRightOptimal = isLeftOptimal = isBottomOptimal = false;
        } else if (requiredSide === "bottom" && isBottomOptimal) {
            isRightOptimal = isLeftOptimal = isTopOptimal = false;
        } else if (requiredSide === "left" && isLeftOptimal) {
            isRightOptimal = isTopOptimal = isBottomOptimal = false;
        } else if (requiredSide === "right" && isRightOptimal) {
            isLeftOptimal = isTopOptimal = isBottomOptimal = false;
        }
        if (requiredSide === "over") {
            const leftToSet = window.innerWidth / 2 - popoverDimensions.realWidth / 2;
            const topToSet = window.innerHeight / 2 - popoverDimensions.realHeight / 2;
            popover.wrapper.style.left = `${leftToSet}px`;
            popover.wrapper.style.right = `auto`;
            popover.wrapper.style.top = `${topToSet}px`;
            popover.wrapper.style.bottom = `auto`;
        } else if (noneOptimal) {
            const leftValue2 = window.innerWidth / 2 - (popoverDimensions == null ? void 0 : popoverDimensions.realWidth) / 2;
            const bottomValue2 = 10;
            popover.wrapper.style.left = `${leftValue2}px`;
            popover.wrapper.style.right = `auto`;
            popover.wrapper.style.bottom = `${bottomValue2}px`;
            popover.wrapper.style.top = `auto`;
        } else if (isLeftOptimal) {
            const leftToSet = Math.min(
                leftValue,
                window.innerWidth - (popoverDimensions == null ? void 0 : popoverDimensions.realWidth) - popoverArrowDimensions.width
            );
            const topToSet = calculateTopForLeftRight(requiredAlignment, {
                elementDimensions,
                popoverDimensions,
                popoverPadding,
                popoverArrowDimensions
            });
            popover.wrapper.style.left = `${leftToSet}px`;
            popover.wrapper.style.top = `${topToSet}px`;
            popover.wrapper.style.bottom = `auto`;
            popover.wrapper.style.right = "auto";
            popoverRenderedSide = "left";
        } else if (isRightOptimal) {
            const rightToSet = Math.min(
                rightValue,
                window.innerWidth - (popoverDimensions == null ? void 0 : popoverDimensions.realWidth) - popoverArrowDimensions.width
            );
            const topToSet = calculateTopForLeftRight(requiredAlignment, {
                elementDimensions,
                popoverDimensions,
                popoverPadding,
                popoverArrowDimensions
            });
            popover.wrapper.style.right = `${rightToSet}px`;
            popover.wrapper.style.top = `${topToSet}px`;
            popover.wrapper.style.bottom = `auto`;
            popover.wrapper.style.left = "auto";
            popoverRenderedSide = "right";
        } else if (isTopOptimal) {
            const topToSet = Math.min(
                topValue,
                window.innerHeight - popoverDimensions.realHeight - popoverArrowDimensions.width
            );
            let leftToSet = calculateLeftForTopBottom(requiredAlignment, {
                elementDimensions,
                popoverDimensions,
                popoverPadding,
                popoverArrowDimensions
            });
            popover.wrapper.style.top = `${topToSet}px`;
            popover.wrapper.style.left = `${leftToSet}px`;
            popover.wrapper.style.bottom = `auto`;
            popover.wrapper.style.right = "auto";
            popoverRenderedSide = "top";
        } else if (isBottomOptimal) {
            const bottomToSet = Math.min(
                bottomValue,
                window.innerHeight - (popoverDimensions == null ? void 0 : popoverDimensions.realHeight) - popoverArrowDimensions.width
            );
            let leftToSet = calculateLeftForTopBottom(requiredAlignment, {
                elementDimensions,
                popoverDimensions,
                popoverPadding,
                popoverArrowDimensions
            });
            popover.wrapper.style.left = `${leftToSet}px`;
            popover.wrapper.style.bottom = `${bottomToSet}px`;
            popover.wrapper.style.top = `auto`;
            popover.wrapper.style.right = "auto";
            popoverRenderedSide = "bottom";
        }
        if (!noneOptimal) {
            renderPopoverArrow(requiredAlignment, popoverRenderedSide, element);
        } else {
            popover.arrow.classList.add("gleap-tour-popover-arrow-none");
        }
    }
    function renderPopoverArrow(alignment, side, element) {
        const popover = getState("popover");
        if (!popover) {
            return;
        }
        const elementDimensions = element.getBoundingClientRect();
        const popoverDimensions = getPopoverDimensions();
        const popoverArrow = popover.arrow;
        const popoverWidth = popoverDimensions.width;
        const windowWidth = window.innerWidth;
        const elementWidth = elementDimensions.width;
        const elementLeft = elementDimensions.left;
        const popoverHeight = popoverDimensions.height;
        const windowHeight = window.innerHeight;
        const elementTop = elementDimensions.top;
        const elementHeight = elementDimensions.height;
        popoverArrow.className = "gleap-tour-popover-arrow";
        let arrowSide = side;
        let arrowAlignment = alignment;
        if (side === "top") {
            if (elementLeft + elementWidth <= 0) {
                arrowSide = "right";
                arrowAlignment = "end";
            } else if (elementLeft + elementWidth - popoverWidth <= 0) {
                arrowSide = "top";
                arrowAlignment = "start";
            }
            if (elementLeft >= windowWidth) {
                arrowSide = "left";
                arrowAlignment = "end";
            } else if (elementLeft + popoverWidth >= windowWidth) {
                arrowSide = "top";
                arrowAlignment = "end";
            }
        } else if (side === "bottom") {
            if (elementLeft + elementWidth <= 0) {
                arrowSide = "right";
                arrowAlignment = "start";
            } else if (elementLeft + elementWidth - popoverWidth <= 0) {
                arrowSide = "bottom";
                arrowAlignment = "start";
            }
            if (elementLeft >= windowWidth) {
                arrowSide = "left";
                arrowAlignment = "start";
            } else if (elementLeft + popoverWidth >= windowWidth) {
                arrowSide = "bottom";
                arrowAlignment = "end";
            }
        } else if (side === "left") {
            if (elementTop + elementHeight <= 0) {
                arrowSide = "bottom";
                arrowAlignment = "end";
            } else if (elementTop + elementHeight - popoverHeight <= 0) {
                arrowSide = "left";
                arrowAlignment = "start";
            }
            if (elementTop >= windowHeight) {
                arrowSide = "top";
                arrowAlignment = "end";
            } else if (elementTop + popoverHeight >= windowHeight) {
                arrowSide = "left";
                arrowAlignment = "end";
            }
        } else if (side === "right") {
            if (elementTop + elementHeight <= 0) {
                arrowSide = "bottom";
                arrowAlignment = "start";
            } else if (elementTop + elementHeight - popoverHeight <= 0) {
                arrowSide = "right";
                arrowAlignment = "start";
            }
            if (elementTop >= windowHeight) {
                arrowSide = "top";
                arrowAlignment = "start";
            } else if (elementTop + popoverHeight >= windowHeight) {
                arrowSide = "right";
                arrowAlignment = "end";
            }
        } else
            ;
        if (!arrowSide) {
            popoverArrow.classList.add("gleap-tour-popover-arrow-none");
        } else {
            popoverArrow.classList.add(`gleap-tour-popover-arrow-side-${arrowSide}`);
            popoverArrow.classList.add(`gleap-tour-popover-arrow-align-${arrowAlignment}`);
        }
    }
    function createPopover() {
        const wrapper = document.createElement("div");
        wrapper.classList.add("gleap-tour-popover");
        const arrow = document.createElement("div");
        arrow.classList.add("gleap-tour-popover-arrow");
        const title = document.createElement("header");
        title.id = "gleap-tour-popover-title";
        title.classList.add("gleap-tour-popover-title");
        title.style.display = "none";
        title.innerText = "Popover Title";
        const description = document.createElement("div");
        description.id = "gleap-tour-popover-description";
        description.classList.add("gleap-tour-popover-description");
        description.style.display = "none";
        description.innerText = "Popover description is here";
        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.classList.add("gleap-tour-popover-close-btn");
        closeButton.setAttribute("aria-label", "Close");
        closeButton.innerHTML = "&times;";
        const footer = document.createElement("footer");
        footer.classList.add("gleap-tour-popover-footer");
        const progress = document.createElement("span");
        progress.classList.add("gleap-tour-popover-progress-text");
        progress.innerText = "";
        const footerButtons = document.createElement("span");
        footerButtons.classList.add("gleap-tour-popover-navigation-btns");
        const previousButton = document.createElement("button");
        previousButton.type = "button";
        previousButton.classList.add("gleap-tour-popover-prev-btn");
        previousButton.innerHTML = "&larr; Previous";
        const nextButton = document.createElement("button");
        nextButton.type = "button";
        nextButton.classList.add("gleap-tour-popover-next-btn");
        nextButton.innerHTML = "Next &rarr;";
        footerButtons.appendChild(previousButton);
        footerButtons.appendChild(nextButton);
        footer.appendChild(progress);
        footer.appendChild(footerButtons);
        wrapper.appendChild(closeButton);
        wrapper.appendChild(arrow);
        wrapper.appendChild(title);
        wrapper.appendChild(description);
        wrapper.appendChild(footer);
        return {
            wrapper,
            arrow,
            title,
            description,
            footer,
            previousButton,
            nextButton,
            closeButton,
            footerButtons,
            progress
        };
    }
    function destroyPopover() {
        var _a;
        const popover = getState("popover");
        if (!popover) {
            return;
        }
        (_a = popover.wrapper.parentElement) == null ? void 0 : _a.removeChild(popover.wrapper);
    }
    function driver(options = {}) {
        configure(options);
        function handleClose() {
            if (!getConfig("allowClose")) {
                return;
            }
            destroy();
        }
        function moveNext() {
            const activeIndex = getState("activeIndex");
            const steps = getConfig("steps") || [];
            if (typeof activeIndex === "undefined") {
                return;
            }
            const nextStepIndex = activeIndex + 1;
            if (steps[nextStepIndex]) {
                drive(nextStepIndex);
            } else {
                destroy();
            }
        }
        function movePrevious() {
            const activeIndex = getState("activeIndex");
            const steps = getConfig("steps") || [];
            if (typeof activeIndex === "undefined") {
                return;
            }
            const previousStepIndex = activeIndex - 1;
            if (steps[previousStepIndex]) {
                drive(previousStepIndex);
            } else {
                destroy();
            }
        }
        function moveTo(index) {
            const steps = getConfig("steps") || [];
            if (steps[index]) {
                drive(index);
            } else {
                destroy();
            }
        }
        function handleArrowLeft() {
            var _a;
            const isTransitioning = getState("__transitionCallback");
            if (isTransitioning) {
                return;
            }
            const activeIndex = getState("activeIndex");
            const activeStep = getState("__activeStep");
            const activeElement = getState("__activeElement");
            
            if (activeStep.mode === "CLICK") {
                return;
            }
            if (typeof activeIndex === "undefined" || typeof activeStep === "undefined") {
                return;
            }
            const currentStepIndex = getState("activeIndex");
            if (typeof currentStepIndex === "undefined") {
                return;
            }
            const onPrevClick = ((_a = activeStep.popover) == null ? void 0 : _a.onPrevClick) || getConfig("onPrevClick");
            if (onPrevClick) {
                return onPrevClick(activeElement, activeStep, {
                    config: getConfig(),
                    state: getState()
                });
            }
            movePrevious();
        }
        function handleArrowRight() {
            var _a;
            const isTransitioning = getState("__transitionCallback");
            if (isTransitioning) {
                return;
            }
            const activeIndex = getState("activeIndex");
            const activeStep = getState("__activeStep");
            const activeElement = getState("__activeElement");

            if (activeStep.mode === "CLICK") {
                return;
            }
            if (typeof activeIndex === "undefined" || typeof activeStep === "undefined") {
                return;
            }
            const onNextClick = ((_a = activeStep.popover) == null ? void 0 : _a.onNextClick) || getConfig("onNextClick");
            if (onNextClick) {
                return onNextClick(activeElement, activeStep, {
                    config: getConfig(),
                    state: getState()
                });
            }
            moveNext();
        }
        function init() {
            if (getState("isInitialized")) {
                return;
            }
            setState("isInitialized", true);
            document.body.classList.add("gleap-tour-active", getConfig("animate") ? "gleap-tour-fade" : "gleap-tour-simple");
            initEvents();
            listen("overlayClick", handleClose);
            listen("escapePress", handleClose);
            listen("arrowLeftPress", handleArrowLeft);
            listen("arrowRightPress", handleArrowRight);
        }
        function drive(stepIndex = 0) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const steps = getConfig("steps");
            if (!steps) {
                console.error("No steps to drive through");
                destroy();
                return;
            }
            if (!steps[stepIndex]) {
                destroy();
                return;
            }
            setState("__activeOnDestroyed", document.activeElement);
            setState("activeIndex", stepIndex);
            const currentStep = steps[stepIndex];
            const hasNextStep = steps[stepIndex + 1];
            const hasPreviousStep = steps[stepIndex - 1];
            const doneBtnText = ((_a = currentStep.popover) == null ? void 0 : _a.doneBtnText) || getConfig("doneBtnText") || "Done";
            const allowsClosing = getConfig("allowClose");
            const showProgress = typeof ((_b = currentStep.popover) == null ? void 0 : _b.showProgress) !== "undefined" ? (_c = currentStep.popover) == null ? void 0 : _c.showProgress : getConfig("showProgress");
            const progressText = ((_d = currentStep.popover) == null ? void 0 : _d.progressText) || getConfig("progressText") || "{{current}} of {{total}}";
            const progressTextReplaced = progressText.replace("{{current}}", `${stepIndex + 1}`).replace("{{total}}", `${steps.length}`);
            const configuredButtons = ((_e = currentStep.popover) == null ? void 0 : _e.showButtons) || getConfig("showButtons");
            const calculatedButtons = [
                "next",
                "previous",
                ...allowsClosing ? ["close"] : []
            ].filter((b) => {
                return !(configuredButtons == null ? void 0 : configuredButtons.length) || configuredButtons.includes(b);
            });
            const onNextClick = ((_f = currentStep.popover) == null ? void 0 : _f.onNextClick) || getConfig("onNextClick");
            const onPrevClick = ((_g = currentStep.popover) == null ? void 0 : _g.onPrevClick) || getConfig("onPrevClick");
            const onCloseClick = ((_h = currentStep.popover) == null ? void 0 : _h.onCloseClick) || getConfig("onCloseClick");
            highlight({
                ...currentStep,
                popover: {
                    showButtons: calculatedButtons,
                    nextBtnText: !hasNextStep ? doneBtnText : void 0,
                    disableButtons: [...!hasPreviousStep ? ["previous"] : []],
                    showProgress,
                    progressText: progressTextReplaced,
                    onNextClick: onNextClick ? onNextClick : () => {
                        if (!hasNextStep) {
                            destroy();
                        } else {
                            drive(stepIndex + 1);
                        }
                    },
                    onPrevClick: onPrevClick ? onPrevClick : () => {
                        drive(stepIndex - 1);
                    },
                    onCloseClick: onCloseClick ? onCloseClick : () => {
                        destroy();
                    },
                    ...(currentStep == null ? void 0 : currentStep.popover) || {}
                }
            });
        }
        function destroy(withOnDestroyStartedHook = true) {
            const activeElement = getState("__activeElement");
            const activeStep = getState("__activeStep");
            const activeOnDestroyed = getState("__activeOnDestroyed");
            const onDestroyStarted = getConfig("onDestroyStarted");
            if (withOnDestroyStartedHook && onDestroyStarted) {
                const isActiveDummyElement = !activeElement || (activeElement == null ? void 0 : activeElement.id) === "gleap-tour-dummy-element";
                onDestroyStarted(isActiveDummyElement ? void 0 : activeElement, activeStep, {
                    config: getConfig(),
                    state: getState()
                });
                return;
            }
            const onDeselected = (activeStep == null ? void 0 : activeStep.onDeselected) || getConfig("onDeselected");
            const onDestroyed = getConfig("onDestroyed");
            document.body.classList.remove("gleap-tour-active", "gleap-tour-fade", "gleap-tour-simple");
            destroyEvents();
            destroyPopover();
            destroyHighlight();
            destroyOverlay();
            destroyEmitter();
            resetState();
            if (activeElement && activeStep) {
                const isActiveDummyElement = activeElement.id === "gleap-tour-dummy-element";
                if (onDeselected) {
                    onDeselected(isActiveDummyElement ? void 0 : activeElement, activeStep, {
                        config: getConfig(),
                        state: getState()
                    });
                }
                if (onDestroyed) {
                    onDestroyed(isActiveDummyElement ? void 0 : activeElement, activeStep, {
                        config: getConfig(),
                        state: getState()
                    });
                }
            }
            if (activeOnDestroyed) {
                activeOnDestroyed.focus();
            }
        }
        return {
            isActive: () => getState("isInitialized") || false,
            refresh: requireRefresh,
            drive: (stepIndex = 0) => {
                init();
                drive(stepIndex);
            },
            setConfig: configure,
            setSteps: (steps) => {
                resetState();
                configure({
                    ...getConfig(),
                    steps
                });
            },
            getConfig,
            getState,
            getActiveIndex: () => getState("activeIndex"),
            isFirstStep: () => getState("activeIndex") === 0,
            isLastStep: () => {
                const steps = getConfig("steps") || [];
                const activeIndex = getState("activeIndex");
                return activeIndex !== void 0 && activeIndex === steps.length - 1;
            },
            getActiveStep: () => getState("activeStep"),
            getActiveElement: () => getState("activeElement"),
            getPreviousElement: () => getState("previousElement"),
            getPreviousStep: () => getState("previousStep"),
            moveNext,
            movePrevious,
            moveTo,
            hasNextStep: () => {
                const steps = getConfig("steps") || [];
                const activeIndex = getState("activeIndex");
                return activeIndex !== void 0 && steps[activeIndex + 1];
            },
            hasPreviousStep: () => {
                const steps = getConfig("steps") || [];
                const activeIndex = getState("activeIndex");
                return activeIndex !== void 0 && steps[activeIndex - 1];
            },
            highlight: (step) => {
                init();
                highlight({
                    ...step,
                    popover: step.popover ? {
                        showButtons: [],
                        showProgress: false,
                        progressText: "",
                        ...step.popover
                    } : void 0
                });
            },
            destroy: () => {
                destroy(false);
            }
        };
    }
    return driver;
}({});

export default GleapTours;