"use strict";

const translations = {
  en: {
    actions: {
      clear: "CLEAR",
      reset: "RESET",
      restart: "Restart"
    },
    controls: {
      dropShort: "DROP",
      hardDrop: "Hard Drop",
      hardDropKeys: "Space",
      holdPiece: "Hold Piece",
      holdPieceKeys: "C",
      holdShort: "HOLD",
      move: "Move",
      moveKeys: "Left / Right",
      moveShort: "MOVE",
      pause: "Pause",
      pauseKeys: "P / Esc",
      pauseShort: "STOP",
      rotate: "Rotate",
      rotateKeys: "Up / X",
      rotateShort: "TURN",
      softDrop: "Soft Drop",
      softDropKeys: "Down",
      softShort: "SOFT"
    },
    intro: {
      continue: "Continue",
      description: {
        line1: "Arrange falling tetrominoes to complete horizontal lines.",
        line2: "Completed lines disappear and award points.",
        line3: "The game speeds up as your level increases.",
        line4: "Use strategy, planning, and quick reactions to survive."
      },
      hiddenTitle: "Welcome screen",
      howToTitle: "How to play",
      languageToggle: "RU",
      posterLabel: "Falling blocks study",
      screenshotSlot1: "Screenshot Slot 1",
      screenshotSlot2: "Screenshot Slot 2",
      screenshotSlot3: "Screenshot Slot 3",
      subtitle: "Classic puzzle game",
      title: "TETRIS"
    },
    leaderboard: {
      empty: "No scores yet",
      prompt: "New high score! Enter initials:"
    },
    overlay: {
      finalScore: "Final score: {score}",
      gameOverTitle: "Game Over",
      pausedText: "Press P or Escape to resume.",
      pausedTitle: "Paused"
    },
    panels: {
      control: "CONTROL",
      hold: "HOLD",
      next: "NEXT",
      rank: "RANK"
    },
    settings: {
      mode: "MODE",
      showIntro: "SHOW INTRO AGAIN"
    },
    stats: {
      level: "LEVEL",
      lines: "LINES",
      score: "SCORE"
    },
    themes: {
      ascii: "ASCII",
      gameboy: "VECTOR BOY",
      modern: "MODERN"
    },
    touch: {
      drop: "DROP",
      swipe: "SWIPE",
      tap: "TAP"
    }
  },
  ru: {
    actions: {
      clear: "ОЧИСТИТЬ",
      reset: "СБРОС",
      restart: "Заново"
    },
    controls: {
      dropShort: "ПАДЕНИЕ",
      hardDrop: "Мгновенное падение",
      hardDropKeys: "Space",
      holdPiece: "Удержание",
      holdPieceKeys: "C",
      holdShort: "УДЕРЖ.",
      move: "Движение",
      moveKeys: "← →",
      moveShort: "ДВИЖ.",
      pause: "Пауза",
      pauseKeys: "P / Esc",
      pauseShort: "ПАУЗА",
      rotate: "Поворот",
      rotateKeys: "↑ / X",
      rotateShort: "ПОВОРОТ",
      softDrop: "Ускорение",
      softDropKeys: "↓",
      softShort: "УСКОР."
    },
    intro: {
      continue: "Продолжить",
      description: {
        line1: "Собирайте горизонтальные линии из падающих фигур.",
        line2: "Заполненные линии исчезают и приносят очки.",
        line3: "С каждым уровнем скорость увеличивается.",
        line4: "Планируйте ходы и продержитесь как можно дольше."
      },
      hiddenTitle: "Приветственный экран",
      howToTitle: "Как играть",
      languageToggle: "EN",
      posterLabel: "Этюд падающих блоков",
      screenshotSlot1: "Слот скриншота 1",
      screenshotSlot2: "Слот скриншота 2",
      screenshotSlot3: "Слот скриншота 3",
      subtitle: "Классическая головоломка",
      title: "TETRIS"
    },
    leaderboard: {
      empty: "Рекордов пока нет",
      prompt: "Новый рекорд! Введите инициалы:"
    },
    overlay: {
      finalScore: "Итоговый счет: {score}",
      gameOverTitle: "Игра окончена",
      pausedText: "Нажмите P или Escape, чтобы продолжить.",
      pausedTitle: "Пауза"
    },
    panels: {
      control: "УПРАВЛЕНИЕ",
      hold: "УДЕРЖАНИЕ",
      next: "СЛЕДУЮЩАЯ",
      rank: "РЕЙТИНГ"
    },
    settings: {
      mode: "РЕЖИМ",
      showIntro: "ПОКАЗАТЬ ИНТРО"
    },
    stats: {
      level: "УРОВЕНЬ",
      lines: "ЛИНИИ",
      score: "СЧЕТ"
    },
    themes: {
      ascii: "ASCII",
      gameboy: "VECTOR BOY",
      modern: "MODERN"
    },
    touch: {
      drop: "ПАДЕНИЕ",
      swipe: "СВАЙП",
      tap: "ТАП"
    }
  }
};

class LocalizationManager {
  constructor(dictionary, storageKey) {
    this.dictionary = dictionary;
    this.storageKey = storageKey;
    this.language = this.normalize(localStorage.getItem(storageKey) || "en");
  }

  normalize(language) {
    return this.dictionary[language] ? language : "en";
  }

  setLanguage(language) {
    this.language = this.normalize(language);
    localStorage.setItem(this.storageKey, this.language);
    document.documentElement.lang = this.language;
    this.apply();
    window.dispatchEvent(new CustomEvent("languagechange", { detail: { language: this.language } }));
  }

  toggleLanguage() {
    this.setLanguage(this.language === "en" ? "ru" : "en");
  }

  t(path, variables = {}) {
    const value = path.split(".").reduce((node, key) => (node ? node[key] : undefined), this.dictionary[this.language]);
    const fallback = path.split(".").reduce((node, key) => (node ? node[key] : undefined), this.dictionary.en);
    const template = typeof value === "string" ? value : fallback || path;
    return Object.entries(variables).reduce(
      (text, [key, replacement]) => text.replaceAll(`{${key}}`, replacement),
      template
    );
  }

  apply(root = document) {
    document.documentElement.lang = this.language;
    root.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = this.t(element.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-label]").forEach((element) => {
      element.setAttribute("aria-label", this.t(element.dataset.i18nLabel));
    });
  }
}

window.translations = translations;
window.LocalizationManager = LocalizationManager;
