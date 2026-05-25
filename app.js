async function init() {
  const res = await fetch("nextgen_hotel_price_comparison.csv");
  const text = await res.text();
  const [header, ...lines] = text.trim().split("\n");
  const keys = header.split(",");

  function parseLine(line, keyCount) {
    const parts = line.split(",");
    if (parts.length <= keyCount) return parts;
    const overflow = parts.length - (keyCount - 1);
    const hotel = parts.slice(0, overflow).join(",");
    return [hotel, ...parts.slice(overflow)];
  }

  const DATA = lines.map((line) => {
    const vals = parseLine(line, keys.length);
    const r = Object.fromEntries(
      keys.map((k, i) => [k.trim(), vals[i]?.trim()]),
    );
    return {
      ...r,
      hotel: r["Hotel"],
      stars: +r["Stars"],
      roomType: r["Room Type"],
      freeCancellation: r["Free Cancellation"],
      breakfastIncluded: r["Breakfast Included"],
      checkIn: r["Check-in Date"],
      checkOut: r["Check-out Date"],
      city: r["City"],
      country: r["Country"],
      stay: r["Stay Type"],
      nights: +r["Nights"],
      rooms: +r["Rooms"],
      currency: r["Currency"],
      cit: +r["CIT Hotel Price USD"],
      trip: +r["Trip.com Price USD"],
      booking: +r["Booking.com Price USD"],
      vsTrip: +r["vs Trip.com %"],
      vsBooking: +r["vs Booking %"],
      savingsTrip:
        ((+r["Trip.com Price USD"] - +r["CIT Hotel Price USD"]) /
          +r["Trip.com Price USD"]) *
        100,
      savingsBooking:
        ((+r["Booking.com Price USD"] - +r["CIT Hotel Price USD"]) /
          +r["Booking.com Price USD"]) *
        100,
    };
  });

  // ─── HERO STATS
  function avg(arr, key) {
    return arr.reduce((s, d) => s + d[key], 0) / arr.length;
  }
  const avgCIT = avg(DATA, "cit");
  const avgTrip = avg(DATA, "trip");
  const avgBook = avg(DATA, "booking");
  const avgSavTrip = avg(DATA, "savingsTrip");
  const avgSavBook = avg(DATA, "savingsBooking");

  document.getElementById("heroStats").innerHTML = `
    <div class="stat-card highlight">
      <div class="stat-label">CIT Hotel avg price</div>
      <div class="stat-value">$${avgCIT.toFixed(0)}</div>
      <div class="stat-sub">per night · USD</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Trip.com avg price</div>
      <div class="stat-value">$${avgTrip.toFixed(0)}</div>
      <div class="stat-badge">You save ${avgSavTrip.toFixed(1)}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Booking.com avg price</div>
      <div class="stat-value">$${avgBook.toFixed(0)}</div>
      <div class="stat-badge">You save ${avgSavBook.toFixed(1)}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Hotels compared</div>
      <div class="stat-value">${DATA.length}</div>
      <div class="stat-sub">across ${[...new Set(DATA.map((d) => d.city))].length} cities</div>
    </div>
  `;

  // ─── CITY CHART
  const cities = [...new Set(DATA.map((d) => d.city))];
  function cityAvg(city, key) {
    const rows = DATA.filter((d) => d.city === city);
    return rows.reduce((s, d) => s + d[key], 0) / rows.length;
  }
  const cityCIT = cities.map((c) => +cityAvg(c, "cit").toFixed(0));
  const cityTrip = cities.map((c) => +cityAvg(c, "trip").toFixed(0));
  const cityBook = cities.map((c) => +cityAvg(c, "booking").toFixed(0));

  new Chart(document.getElementById("cityChart").getContext("2d"), {
    type: "bar",
    data: {
      labels: cities,
      datasets: [
        {
          label: "CIT Hotel",
          data: cityCIT,
          backgroundColor: "#e3a916",
          borderRadius: 3,
        },
        {
          label: "Trip.com",
          data: cityTrip,
          backgroundColor: "#e05c2a",
          borderRadius: 3,
        },
        {
          label: "Booking.com",
          data: cityBook,
          backgroundColor: "#003580",
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` $${ctx.raw}` } },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "Inter", size: 11 },
            color: "#7a7870",
          },
        },
        y: {
          grid: { color: "#eeece6" },
          ticks: {
            callback: (v) => "$" + v,
            font: { family: "Inter", size: 11 },
            color: "#7a7870",
          },
          border: { display: false },
        },
      },
    },
  });

  // ─── SAVINGS CHART
  function citySav(city, key) {
    const rows = DATA.filter((d) => d.city === city);
    return +(rows.reduce((s, d) => s + d[key], 0) / rows.length).toFixed(1);
  }
  const savTrip = cities.map((c) => citySav(c, "savingsTrip"));
  const savBook = cities.map((c) => citySav(c, "savingsBooking"));

  new Chart(document.getElementById("savingsChart").getContext("2d"), {
    type: "bar",
    data: {
      labels: cities,
      datasets: [
        {
          label: "vs Trip.com",
          data: savTrip,
          backgroundColor: "#e05c2a",
          borderRadius: 3,
        },
        {
          label: "vs Booking.com",
          data: savBook,
          backgroundColor: "#003580",
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.raw}% cheaper` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "Inter", size: 11 },
            color: "#7a7870",
          },
        },
        y: {
          grid: { color: "#eeece6" },
          ticks: {
            callback: (v) => v + "%",
            font: { family: "Inter", size: 11 },
            color: "#7a7870",
          },
          border: { display: false },
        },
      },
    },
  });

  // ─── FILTERS + TABLE
  const filterCity = document.getElementById("filterCity");
  const filterStars = document.getElementById("filterStars");
  const filterStay = document.getElementById("filterStay");

  cities.forEach((c) => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    filterCity.appendChild(o);
  });

  let currentSort = "savings_trip";
  let currentPage = 1;
  const PER_PAGE = 15;

  function getFiltered() {
    let rows = [...DATA];
    if (filterCity.value) rows = rows.filter((d) => d.city === filterCity.value);
    if (filterStars.value)
      rows = rows.filter((d) => d.stars === +filterStars.value);
    if (filterStay.value) rows = rows.filter((d) => d.stay === filterStay.value);
    return rows;
  }

  function getSorted(rows) {
    return rows.sort((a, b) => {
      if (currentSort === "savings_trip") return b.savingsTrip - a.savingsTrip;
      if (currentSort === "savings_booking")
        return b.savingsBooking - a.savingsBooking;
      if (currentSort === "price_asc") return a.cit - b.cit;
      if (currentSort === "price_desc") return b.cit - a.cit;
      return 0;
    });
  }

  function savingsClass(v) {
    if (v < 0) return "savings-neg";
    if (v < 15) return "savings-low";
    if (v < 30) return "savings-mid";
    return "savings-high";
  }

  function render() {
    const filtered = getSorted(getFiltered());
    const total = filtered.length;
    const pages = Math.ceil(total / PER_PAGE);
    if (currentPage > pages) currentPage = 1;
    const slice = filtered.slice(
      (currentPage - 1) * PER_PAGE,
      currentPage * PER_PAGE,
    );

    document.getElementById("tableCount").textContent = total + " hotels";
    document.getElementById("tableInfo").textContent =
      `Showing ${(currentPage - 1) * PER_PAGE + 1}–${Math.min(currentPage * PER_PAGE, total)} of ${total}`;

    const tbody = document.getElementById("tableBody");
    tbody.innerHTML =
      slice.length === 0
        ? '<tr><td colspan="8"><div class="no-results">No hotels match your filters.</div></td></tr>'
        : slice
            .map(
              (d) => `
          <tr>
            <td class="hotel-name">${d.hotel}</td>
            <td><span class="city-badge">${d.city}</span></td>
            <td><span class="stars">${"★".repeat(d.stars)}</span></td>
            <td><span class="price-cit">$${d.cit.toFixed(0)}</span></td>
            <td><span class="price-other">$${d.trip.toFixed(0)}</span></td>
            <td class="price-other-col"><span class="price-other">$${d.booking.toFixed(0)}</span></td>
            <td><span class="savings-pill ${savingsClass(d.savingsTrip)}">${d.savingsTrip >= 0 ? "+" : ""}${d.savingsTrip.toFixed(1)}%</span></td>
            <td><span class="savings-pill ${savingsClass(d.savingsBooking)}">${d.savingsBooking >= 0 ? "+" : ""}${d.savingsBooking.toFixed(1)}%</span></td>
          </tr>`,
            )
            .join("");

    const pag = document.getElementById("pagination");
    pag.innerHTML = "";
    const mkBtn = (label, page, disabled, active) => {
      const b = document.createElement("button");
      b.className = "page-btn" + (active ? " active" : "");
      b.textContent = label;
      b.disabled = disabled;
      if (!disabled)
        b.onclick = () => {
          currentPage = page;
          render();
        };
      return b;
    };
    pag.appendChild(mkBtn("‹", currentPage - 1, currentPage === 1, false));
    for (let i = 1; i <= pages; i++) {
      if (
        pages > 7 &&
        i > 2 &&
        i < pages - 1 &&
        Math.abs(i - currentPage) > 1
      ) {
        if (i === 3 || i === pages - 2) {
          const e = document.createElement("span");
          e.textContent = "…";
          e.style.cssText =
            "padding:0 4px;font-size:12px;color:#7a7870;align-self:center";
          pag.appendChild(e);
        }
        continue;
      }
      pag.appendChild(mkBtn(i, i, false, i === currentPage));
    }
    pag.appendChild(
      mkBtn("›", currentPage + 1, currentPage === pages || pages === 0, false),
    );
  }

  [filterCity, filterStars, filterStay].forEach((el) => {
    el.addEventListener("change", () => {
      currentPage = 1;
      render();
    });
  });
  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".sort-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentSort = btn.dataset.sort;
      currentPage = 1;
      render();
    });
  });

  render();
}

init();
