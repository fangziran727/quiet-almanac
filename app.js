(function () {
  var cardsRoot = document.getElementById("messageCards");
  var template = document.getElementById("cardTemplate");
  var chatScreen = document.getElementById("chatScreen");
  var campusScreen = document.getElementById("campusScreen");
  var MINUTES_PER_DAY = 24 * 60 * 60 * 1000;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatDate(date) {
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("-");
  }

  function shiftedDate(baseDate, offsetDays) {
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + offsetDays);
  }

  function daySerial(date) {
    return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MINUTES_PER_DAY);
  }

  function pseudoRandom(date, salt) {
    return (daySerial(date) * 37 + salt * 101 + 23) % 997;
  }

  function dailySendTimes(date) {
    var firstMinutes = 9 * 60 + pseudoRandom(date, 1) % 61;
    var gapMinutes = 20 + pseudoRandom(date, 2) % 101;
    var secondMinutes = firstMinutes + gapMinutes;

    return [
      pad(Math.floor(firstMinutes / 60)) + ":" + pad(firstMinutes % 60),
      pad(Math.floor(secondMinutes / 60)) + ":" + pad(secondMinutes % 60)
    ];
  }

  var WEEKDAY_NAMES = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

  function daysBetween(messageDate, today) {
    var startOfDay = function (date) {
      return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    };
    return Math.round((startOfDay(today) - startOfDay(messageDate)) / MINUTES_PER_DAY);
  }

  function monthDayLabel(date, today) {
    var label = (date.getMonth() + 1) + "月" + date.getDate() + "日";
    if (date.getFullYear() !== today.getFullYear()) {
      label = date.getFullYear() + "年" + label;
    }
    return label;
  }

  function chatTimeLabel(messageDate, sendTime) {
    var today = new Date();
    var daysAgo = daysBetween(messageDate, today);

    if (daysAgo <= 0) {
      return sendTime;
    }
    if (daysAgo === 1) {
      return "昨天 " + sendTime;
    }
    if (daysAgo <= 6) {
      return WEEKDAY_NAMES[messageDate.getDay()] + " " + sendTime;
    }
    return monthDayLabel(messageDate, today) + " " + sendTime;
  }

  function appendTimeLabel(time) {
    var label = document.createElement("div");
    label.className = "message-time";
    label.textContent = time;
    cardsRoot.appendChild(label);
  }

  function appendMessage(message) {
    var fragment = template.content.cloneNode(true);
    var card = fragment.querySelector(".message-card");

    fragment.querySelector(".venue").textContent = message.venue;
    fragment.querySelector(".reservation-time").textContent = formatDate(message.date) + " " + message.reservationTime;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.addEventListener("click", showCampusScreen);
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showCampusScreen();
      }
    });
    cardsRoot.appendChild(fragment);
  }

  function dailyMessages(date) {
    var sendTimes = dailySendTimes(date);
    return [
      { venue: "深圳校区游泳池-场地1", date: date, reservationTime: "16:30", sentAt: sendTimes[0] },
      { venue: "深圳校区健身房-场地1", date: date, reservationTime: "16:00", sentAt: sendTimes[1] }
    ];
  }

  function renderMessages() {
    var today = new Date();
    var todayOnly = shiftedDate(today, 0);
    var messageGroups = [
      shiftedDate(today, -3),
      shiftedDate(today, -2),
      shiftedDate(today, -1),
      todayOnly
    ];

    cardsRoot.textContent = "";

    messageGroups.forEach(function (date) {
      dailyMessages(date).forEach(function (message) {
        appendTimeLabel(chatTimeLabel(message.date, message.sentAt));
        appendMessage(message);
      });
    });
  }

  function showCampusScreen(updateHash) {
    chatScreen.classList.add("is-hidden");
    campusScreen.classList.remove("is-hidden");
    campusScreen.querySelector(".campus-content").scrollTop = 0;
    if (updateHash !== false && window.location.hash !== "#campus") {
      window.location.hash = "campus";
    }
  }

  function showChatScreen() {
    campusScreen.classList.add("is-hidden");
    chatScreen.classList.remove("is-hidden");
    if (window.location.hash === "#campus") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  document.querySelectorAll("[data-return-chat]").forEach(function (button) {
    button.addEventListener("click", showChatScreen);
  });

  function blockPinchZoom() {
    document.addEventListener("gesturestart", function (event) {
      event.preventDefault();
    });
    document.addEventListener("gesturechange", function (event) {
      event.preventDefault();
    });
    document.addEventListener("gestureend", function (event) {
      event.preventDefault();
    });
    document.addEventListener("touchmove", function (event) {
      if (event.touches && event.touches.length > 1) {
        event.preventDefault();
      }
    }, { passive: false });
  }

  function currentAppHeight() {
    var vv = window.visualViewport;
    var measured = vv && vv.height ? vv.height : 0;
    var layoutHeight = window.innerHeight;
    if (measured > 0) {
      return measured;
    }
    var isTouch = ("ontouchstart" in window) ||
      (typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 0);
    var activeTag = document.activeElement ? document.activeElement.tagName : "";
    if (isTouch && (activeTag === "INPUT" || activeTag === "TEXTAREA")) {
      var estimate = Math.round(Math.min(layoutHeight * 0.45, 420));
      return Math.max(200, layoutHeight - estimate);
    }
    return layoutHeight;
  }

  function currentViewportTop() {
    var vv = window.visualViewport;
    return vv && typeof vv.offsetTop === "number" && vv.offsetTop > 0
      ? Math.round(vv.offsetTop)
      : 0;
  }

  var lastAppHeight = null;
  var lastShellTop = null;
  var viewportRafId = null;

  function startViewportRaf() {
    if (viewportRafId !== null) return;
    function step() {
      syncViewport();
      viewportRafId = requestAnimationFrame(step);
    }
    viewportRafId = requestAnimationFrame(step);
  }

  function stopViewportRaf() {
    if (viewportRafId !== null) {
      cancelAnimationFrame(viewportRafId);
      viewportRafId = null;
    }
  }

  function syncViewport() {
    var height = Math.round(currentAppHeight());
    var top = currentViewportTop();
    var rootStyle = document.documentElement.style;
    if (height !== lastAppHeight) {
      lastAppHeight = height;
      rootStyle.setProperty("--app-height", height + "px");
    }
    if (top !== lastShellTop) {
      lastShellTop = top;
      rootStyle.setProperty("--shell-top", top + "px");
    }
  }

  syncViewport();
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncViewport);
    window.visualViewport.addEventListener("scroll", syncViewport);
  }
  window.addEventListener("resize", syncViewport);
  document.addEventListener("focusin", function () {
    var active = document.activeElement;
    var isTextInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
    var isTouch = ("ontouchstart" in window) ||
      (typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 0);
    var vv = window.visualViewport;
    var layoutHeight = window.innerHeight;
    var alreadyShrunk = vv && vv.height > 0 && vv.height < layoutHeight;
    if (isTextInput && isTouch && !alreadyShrunk) {
      var estimate = Math.round(Math.min(layoutHeight * 0.45, 420));
      var estimatedHeight = Math.max(200, layoutHeight - estimate);
      lastAppHeight = estimatedHeight;
      document.documentElement.style.setProperty("--app-height", estimatedHeight + "px");
    }
    startViewportRaf();
    setTimeout(syncViewport, 250);
  });
  document.addEventListener("focusout", function () {
    setTimeout(syncViewport, 100);
    setTimeout(stopViewportRaf, 120);
  });
  setInterval(syncViewport, 250);

  var emojiPanel = document.querySelector(".emoji-panel");
  var morePanel = document.querySelector(".more-panel");
  var inputField = document.querySelector(".input-field");

  function closeInputPanels() {
    if (emojiPanel) emojiPanel.classList.add("is-hidden");
    if (morePanel) morePanel.classList.add("is-hidden");
  }

  function openInputPanel(kind) {
    var target = kind === "emoji" ? emojiPanel : morePanel;
    var other = kind === "emoji" ? morePanel : emojiPanel;
    if (!target) return;
    var opening = target.classList.contains("is-hidden");
    if (other) other.classList.add("is-hidden");
    target.classList.toggle("is-hidden", !opening);
    if (opening) {
      if (document.activeElement === inputField && inputField) {
        inputField.blur();
      }
    } else if (inputField) {
      inputField.focus({ preventScroll: true });
    }
  }

  var emojiButton = document.querySelector(".emoji-button");
  var plusButton = document.querySelector(".plus-button");
  var voiceButton = document.querySelector(".voice-button");
  if (emojiButton) emojiButton.addEventListener("click", function () { openInputPanel("emoji"); });
  if (plusButton) plusButton.addEventListener("click", function () { openInputPanel("more"); });
  if (voiceButton) voiceButton.addEventListener("click", closeInputPanels);

  if (inputField) {
    inputField.addEventListener("click", closeInputPanels);
  }

  var emojiGrid = document.getElementById("emojiGrid");
  if (emojiGrid) {
    var emojiSet = [
      "😀","😁","😂","🤣","😊","😇","🙂","😉",
      "😍","🥰","😘","😜","🤪","😎","🤩","🥳",
      "😢","😭","😤","😡","🤯","😱","🥶","🤒",
      "👍","👎","👏","🙏","💪","🤝","✌️","🤞",
      "❤️","🧡","💛","💚","💙","💜","🖤","💯",
      "🎉","🎊","🔥","✨","⭐","🌹","🍀","🐶"
    ];
    emojiSet.forEach(function (emoji) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = emoji;
      button.setAttribute("aria-label", "表情 " + emoji);
      button.addEventListener("click", function () {
        if (inputField) {
          inputField.value += emoji;
          inputField.focus({ preventScroll: true });
        }
      });
      emojiGrid.appendChild(button);
    });
  }

  if (/[?&]debug=1/.test(window.location.search)) {
    var debugEl = document.createElement("div");
    debugEl.style.cssText = "position:fixed;top:60px;left:8px;z-index:99999;padding:6px 8px;border-radius:4px;background:rgba(0,0,0,.78);color:#fff;font:11px/1.4 monospace;pointer-events:none;";
    debugEl.textContent = "debug";
    document.body.appendChild(debugEl);
    var minVvTop = Infinity;
    var maxVvTop = -Infinity;
    var minHdrTop = Infinity;
    var maxHdrTop = -Infinity;
    function updateDebug() {
      var vv = window.visualViewport;
      var header = document.querySelector(".chat-header");
      var shell = document.querySelector(".phone-shell");
      var hb = header ? header.getBoundingClientRect() : null;
      var sb = shell ? shell.getBoundingClientRect() : null;
      var vvTop = vv && typeof vv.offsetTop === "number" ? Math.round(vv.offsetTop) : 0;
      var hdrTop = hb ? Math.round(hb.top) : -1;
      if (vvTop < minVvTop) minVvTop = vvTop;
      if (vvTop > maxVvTop) maxVvTop = vvTop;
      if (hdrTop < minHdrTop) minHdrTop = hdrTop;
      if (hdrTop > maxHdrTop) maxHdrTop = hdrTop;
      debugEl.textContent = [
        "innerH=" + Math.round(window.innerHeight),
        "vvH=" + Math.round(vv ? vv.height : 0),
        "vvTop=" + vvTop + "(" + minVvTop + "-" + maxVvTop + ")",
        "hdrTop=" + hdrTop + "(" + minHdrTop + "-" + maxHdrTop + ")",
        "shellTop=" + Math.round(sb ? sb.top : -1),
        "shellH=" + Math.round(sb ? sb.height : -1)
      ].join(" | ");
    }
    setInterval(updateDebug, 150);
    document.addEventListener("focusin", function () { setTimeout(updateDebug, 0); });
    document.addEventListener("focusout", function () { setTimeout(updateDebug, 0); });
  }

  blockPinchZoom();
  renderMessages();

  if (window.location.hash === "#campus") {
    showCampusScreen(false);
  }
})();
