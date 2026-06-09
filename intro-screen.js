"use strict";

class ScreenshotPlaceholders {
  constructor(slots) {
    this.slots = [...slots];
  }

  setScreenshots(sources = []) {
    this.slots.forEach((slot, index) => {
      const image = slot.querySelector(".screenshot-image");
      const placeholder = slot.querySelector(".screenshot-placeholder");
      const source = sources[index] || image.getAttribute("src");

      const showImage = () => {
        image.hidden = false;
        placeholder.hidden = true;
        slot.classList.add("has-image");
      };

      const showPlaceholder = () => {
        image.hidden = true;
        placeholder.hidden = false;
        slot.classList.remove("has-image");
      };

      image.addEventListener("load", showImage, { once: true });
      image.addEventListener("error", showPlaceholder, { once: true });

      if (source) {
        image.src = source;
        if (image.complete && image.naturalWidth > 0) {
          showImage();
        }
      } else {
        image.removeAttribute("src");
        showPlaceholder();
      }
    });
  }
}

class IntroScreen {
  constructor({ element, continueButton, languageButton, storage, i18n, screenshots = [] }) {
    this.element = element;
    this.continueButton = continueButton;
    this.languageButton = languageButton;
    this.storage = storage;
    this.i18n = i18n;
    this.isVisible = !storage.hasViewedIntro();
    this.screenshots = new ScreenshotPlaceholders(element.querySelectorAll(".screenshot-slot"));

    this.screenshots.setScreenshots(screenshots);
    this.bindEvents();
    this.syncVisibility(false);
  }

  bindEvents() {
    this.continueButton.addEventListener("click", () => this.complete());
    this.languageButton.addEventListener("click", () => this.i18n.toggleLanguage());
    window.addEventListener("languagechange", () => this.updateLabels());
  }

  updateLabels() {
    this.element.setAttribute("aria-label", this.i18n.t("intro.hiddenTitle"));
  }

  show() {
    this.isVisible = true;
    this.syncVisibility(true);
  }

  complete() {
    this.storage.setIntroViewed();
    this.isVisible = false;
    this.syncVisibility(true);
    window.dispatchEvent(new CustomEvent("introcomplete"));
  }

  syncVisibility(animate) {
    this.element.classList.toggle("is-hidden", !this.isVisible);
    this.element.classList.toggle("is-leaving", animate && !this.isVisible);
    document.body.classList.toggle("intro-active", this.isVisible);
    this.element.setAttribute("aria-hidden", String(!this.isVisible));
    this.updateLabels();
  }
}

window.ScreenshotPlaceholders = ScreenshotPlaceholders;
window.IntroScreen = IntroScreen;
