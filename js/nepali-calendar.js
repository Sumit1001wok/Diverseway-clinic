"use strict";

// Self-contained Bikram Sambat (Nepali) calendar widget for the three
// dashboards (admin, therapist, patient account) — injects its own DOM,
// same pattern as js/chatbot.js. No client-side conversion library exists
// (no bundler here), so the BS<->AD day-count table below is embedded
// directly. Data + anchor date (1978-01-01 BS = 1921-04-13 AD) sourced from
// the widely-used sbmdkl/nepali-date-converter reference table, covering
// every year from 1978 to 2099 BS (~1921-2043 AD).
(function () {
  if (document.querySelector(".nepali-calendar-widget")) {
    return;
  }

  const MIN_YEAR_BS = 1978;
  const MAX_YEAR_BS = 2099;
  const ANCHOR_AD = new Date(1921, 3, 13); // April is month index 3

  // Each entry is the 12 month lengths for that BS year, in order
  // (Baisakh..Chaitra). Index this table via BS_DATA[year][month - 1].
  const BS_DATA = {
    1978: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    1979: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    1980: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    1981: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
    1982: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    1983: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    1984: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    1985: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
    1986: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    1987: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    1988: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    1989: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    1990: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    1991: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    1992: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    1993: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    1994: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    1995: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
    1996: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    1997: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    1998: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    1999: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2000: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2003: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2004: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2005: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2006: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2007: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2008: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
    2009: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2010: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2011: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2012: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
    2013: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2014: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2015: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2016: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
    2017: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2018: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2019: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2020: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    2021: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2022: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
    2023: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2024: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    2025: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2026: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2027: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2028: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2029: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
    2030: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2031: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2032: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2033: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2034: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2035: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
    2036: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2037: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2038: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2039: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
    2040: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2041: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2042: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2043: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
    2044: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2045: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2046: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2047: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    2048: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2049: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
    2050: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2051: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    2052: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2053: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
    2054: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2055: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2056: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
    2057: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2058: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2059: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2061: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2062: [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
    2063: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2064: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2065: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2066: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
    2067: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2068: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2069: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
    2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
    2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
    2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
    2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
    2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
    2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
    2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2091: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
    2092: [30, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2093: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2094: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
    2095: [31, 31, 32, 31, 31, 31, 30, 29, 30, 30, 30, 30],
    2096: [30, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2097: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2098: [31, 31, 32, 31, 31, 31, 29, 30, 29, 30, 29, 31],
    2099: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  };

  const MONTHS_NP = [
    "बैशाख", "जेठ", "असार", "श्रावण", "भदौ", "असोज",
    "कार्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत",
  ];
  const WEEKDAYS_NP = ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहिबार", "शुक्रबार", "शनिबार"];
  const WEEKDAYS_NP_SHORT = ["आइत", "सोम", "मंगल", "बुध", "बिहि", "शुक्र", "शनि"];
  const DEV_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

  function toDevanagari(num) {
    return String(num)
      .split("")
      .map((ch) => DEV_DIGITS[Number(ch)] ?? ch)
      .join("");
  }

  function daysInBsMonth(year, month) {
    const row = BS_DATA[year];
    return row ? row[month - 1] : undefined;
  }

  function stripTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function adToBs(adDate) {
    const daysElapsed = Math.round((stripTime(adDate) - ANCHOR_AD) / 86400000);
    let year = MIN_YEAR_BS;
    let month = 1;
    let remaining = daysElapsed;

    while (true) {
      const monthDays = daysInBsMonth(year, month);
      if (monthDays === undefined || remaining < monthDays) {
        break;
      }
      remaining -= monthDays;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }

    return { year, month, day: remaining + 1 };
  }

  function bsToAd(year, month, day) {
    let totalDays = 0;
    for (let y = MIN_YEAR_BS; y < year; y++) {
      for (let m = 1; m <= 12; m++) {
        totalDays += daysInBsMonth(y, m) || 0;
      }
    }
    for (let m = 1; m < month; m++) {
      totalDays += daysInBsMonth(year, m) || 0;
    }
    totalDays += day - 1;

    const result = new Date(ANCHOR_AD);
    result.setDate(result.getDate() + totalDays);
    return result;
  }

  const todayAd = new Date();
  const todayBs = adToBs(todayAd);
  let viewYear = todayBs.year;
  let viewMonth = todayBs.month;

  const widget = document.createElement("div");
  widget.className = "nepali-calendar-widget";
  widget.innerHTML = `
    <button type="button" class="npc-toggle" aria-expanded="false" aria-label="Nepali calendar">
      <span class="npc-day">${toDevanagari(todayBs.day)}</span>
      <span class="npc-meta">
        <span class="npc-month-year">${MONTHS_NP[todayBs.month - 1]} ${toDevanagari(todayBs.year)}</span>
        <span class="npc-weekday">${WEEKDAYS_NP[todayAd.getDay()]}</span>
      </span>
    </button>
    <div class="npc-panel hidden">
      <div class="npc-panel-head">
        <button type="button" class="npc-nav" data-nav="-1" aria-label="Previous month">‹</button>
        <span class="npc-panel-title"></span>
        <button type="button" class="npc-nav" data-nav="1" aria-label="Next month">›</button>
      </div>
      <div class="npc-weekday-row">
        ${WEEKDAYS_NP_SHORT.map((w) => `<span>${w}</span>`).join("")}
      </div>
      <div class="npc-grid"></div>
      <p class="npc-ad-date"></p>
    </div>
  `;

  document.body.appendChild(widget);

  const toggleBtn = widget.querySelector(".npc-toggle");
  const panel = widget.querySelector(".npc-panel");
  const panelTitle = widget.querySelector(".npc-panel-title");
  const gridEl = widget.querySelector(".npc-grid");
  const adDateEl = widget.querySelector(".npc-ad-date");

  function renderPanel() {
    panelTitle.textContent = `${MONTHS_NP[viewMonth - 1]} ${toDevanagari(viewYear)}`;

    const monthDays = daysInBsMonth(viewYear, viewMonth);
    const firstWeekday = bsToAd(viewYear, viewMonth, 1).getDay();

    let cells = "";
    for (let i = 0; i < firstWeekday; i++) {
      cells += `<span class="npc-cell npc-cell-empty"></span>`;
    }
    for (let d = 1; d <= monthDays; d++) {
      const isToday = viewYear === todayBs.year && viewMonth === todayBs.month && d === todayBs.day;
      cells += `<span class="npc-cell${isToday ? " is-today" : ""}">${toDevanagari(d)}</span>`;
    }
    gridEl.innerHTML = cells;

    const monthStartAd = bsToAd(viewYear, viewMonth, 1);
    const monthEndAd = bsToAd(viewYear, viewMonth, monthDays);
    const fmt = (d) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    adDateEl.textContent = `${fmt(monthStartAd)} – ${fmt(monthEndAd)}, ${monthEndAd.getFullYear()} AD`;
  }

  toggleBtn.addEventListener("click", () => {
    const isOpen = panel.classList.toggle("is-open");
    panel.classList.toggle("hidden", !isOpen);
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      viewYear = todayBs.year;
      viewMonth = todayBs.month;
      renderPanel();
    }
  });

  widget.querySelectorAll(".npc-nav").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = Number(btn.dataset.nav);
      viewMonth += dir;
      if (viewMonth < 1) {
        viewMonth = 12;
        viewYear -= 1;
      } else if (viewMonth > 12) {
        viewMonth = 1;
        viewYear += 1;
      }
      viewYear = Math.min(Math.max(viewYear, MIN_YEAR_BS), MAX_YEAR_BS);
      renderPanel();
    });
  });

  document.addEventListener("click", (event) => {
    if (!widget.contains(event.target) && panel.classList.contains("is-open")) {
      panel.classList.remove("is-open");
      panel.classList.add("hidden");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  });
})();
