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

  function cleanField(value) {
    if (!value) return "";
    return value === "NULL" ? "" : value;
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
      roomType: cleanField(r["Room Type"]),
      bedType: cleanField(r["Bed Type"]),
      freeCancellation: cleanField(r["Free Cancellation"]),
      breakfastIncluded: cleanField(r["Breakfast Included"]),
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
  let cityMode = "price";
  let stayMode = "price";

  document.getElementById("heroStats").innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Average Hotel Price</div>
      <div class="stat-value">${avgSavTrip.toFixed(1)}%</div>
      <div class="stat-badge">Cheaper than Trip.com</div>
      </div>
      <div class="stat-card">
      <div class="stat-label">Average Hotel Price</div>
      <div class="stat-value">${avgSavBook.toFixed(1)}%</div>
      <div class="stat-badge">Cheaper than Booking.com</div>
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

  function citySav(city, key) {
    const rows = DATA.filter((d) => d.city === city);
    return +(rows.reduce((s, d) => s + d[key], 0) / rows.length).toFixed(1);
  }
  const savTrip = cities.map((c) => citySav(c, "savingsTrip"));
  const savBook = cities.map((c) => citySav(c, "savingsBooking"));

  function cityChartData(mode) {
    if (mode === "savings") {
      return {
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
      };
    }
    return {
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
    };
  }

  const cityChart = new Chart(
    document.getElementById("cityChart").getContext("2d"),
    {
      type: "bar",
      data: cityChartData("price"),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                cityMode === "savings" ? ` ${ctx.raw}% cheaper` : ` $${ctx.raw}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: "IBM Plex Sans", size: 11 },
              color: "#7a7870",
            },
          },
          y: {
            grid: { color: "#eeece6" },
            ticks: {
              callback: (v) =>
                cityMode === "savings" ? v + "%" : "$" + v,
              font: { family: "IBM Plex Sans", size: 11 },
              color: "#7a7870",
            },
            border: { display: false },
          },
        },
      },
    },
  );

  // ─── SAVINGS CHART
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
            font: { family: "IBM Plex Sans", size: 11 },
            color: "#7a7870",
          },
        },
        y: {
          grid: { color: "#eeece6" },
          ticks: {
            callback: (v) => v + "%",
            font: { family: "IBM Plex Sans", size: 11 },
            color: "#7a7870",
          },
          border: { display: false },
        },
      },
    },
  });

  // ─── SAVINGS DISTRIBUTION
  const binLabels = ["<0%", "0-10%", "10-20%", "20-30%", "30-40%", "40-50%", "50%+"];
  function binSavings(values) {
    const bins = Array(binLabels.length).fill(0);
    values.forEach((v) => {
      if (v < 0) bins[0] += 1;
      else if (v < 10) bins[1] += 1;
      else if (v < 20) bins[2] += 1;
      else if (v < 30) bins[3] += 1;
      else if (v < 40) bins[4] += 1;
      else if (v < 50) bins[5] += 1;
      else bins[6] += 1;
    });
    return bins;
  }

  const distTrip = binSavings(DATA.map((d) => d.savingsTrip));
  const distBook = binSavings(DATA.map((d) => d.savingsBooking));
  new Chart(document.getElementById("distributionChart").getContext("2d"), {
    type: "bar",
    data: {
      labels: binLabels,
      datasets: [
        {
          label: "vs Trip.com",
          data: distTrip,
          backgroundColor: "#e05c2a",
          borderRadius: 3,
        },
        {
          label: "vs Booking.com",
          data: distBook,
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
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} hotels` } },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "IBM Plex Sans", size: 11 },
            color: "#7a7870",
          },
        },
        y: {
          grid: { color: "#eeece6" },
          ticks: {
            precision: 0,
            font: { family: "IBM Plex Sans", size: 11 },
            color: "#7a7870",
          },
          border: { display: false },
        },
      },
    },
  });

  // ─── STARS CHART
  const starValues = [...new Set(DATA.map((d) => d.stars))].sort();
  function starAvg(star, key) {
    const rows = DATA.filter((d) => d.stars === star);
    return +(rows.reduce((s, d) => s + d[key], 0) / rows.length).toFixed(1);
  }
  const starTrip = starValues.map((s) => starAvg(s, "savingsTrip"));
  const starBook = starValues.map((s) => starAvg(s, "savingsBooking"));
  new Chart(document.getElementById("starsChart").getContext("2d"), {
    type: "bar",
    data: {
      labels: starValues.map((s) => `${s}★`),
      datasets: [
        {
          label: "vs Trip.com",
          data: starTrip,
          backgroundColor: "#e05c2a",
          borderRadius: 3,
        },
        {
          label: "vs Booking.com",
          data: starBook,
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
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw}% cheaper` } },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "IBM Plex Sans", size: 11 },
            color: "#7a7870",
          },
        },
        y: {
          grid: { color: "#eeece6" },
          ticks: {
            callback: (v) => v + "%",
            font: { family: "IBM Plex Sans", size: 11 },
            color: "#7a7870",
          },
          border: { display: false },
        },
      },
    },
  });

  // ─── STAY TYPE CHART
  const stayTypes = [...new Set(DATA.map((d) => d.stay))];
  function stayAvg(stay, key) {
    const rows = DATA.filter((d) => d.stay === stay);
    return +(rows.reduce((s, d) => s + d[key], 0) / rows.length).toFixed(1);
  }
  const stayPrice = {
    cit: stayTypes.map((s) => stayAvg(s, "cit")),
    trip: stayTypes.map((s) => stayAvg(s, "trip")),
    book: stayTypes.map((s) => stayAvg(s, "booking")),
  };
  const staySavings = {
    trip: stayTypes.map((s) => stayAvg(s, "savingsTrip")),
    book: stayTypes.map((s) => stayAvg(s, "savingsBooking")),
  };

  function stayChartData(mode) {
    if (mode === "savings") {
      return {
        labels: stayTypes,
        datasets: [
          {
            label: "vs Trip.com",
            data: staySavings.trip,
            backgroundColor: "#e05c2a",
            borderRadius: 3,
          },
          {
            label: "vs Booking.com",
            data: staySavings.book,
            backgroundColor: "#003580",
            borderRadius: 3,
          },
        ],
      };
    }
    return {
      labels: stayTypes,
      datasets: [
        {
          label: "CIT Hotel",
          data: stayPrice.cit,
          backgroundColor: "#e3a916",
          borderRadius: 3,
        },
        {
          label: "Trip.com",
          data: stayPrice.trip,
          backgroundColor: "#e05c2a",
          borderRadius: 3,
        },
        {
          label: "Booking.com",
          data: stayPrice.book,
          backgroundColor: "#003580",
          borderRadius: 3,
        },
      ],
    };
  }

  const stayChart = new Chart(
    document.getElementById("stayChart").getContext("2d"),
    {
      type: "bar",
      data: stayChartData("price"),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                stayMode === "savings" ? ` ${ctx.raw}% cheaper` : ` $${ctx.raw}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: "IBM Plex Sans", size: 11 },
              color: "#7a7870",
            },
          },
          y: {
            grid: { color: "#eeece6" },
            ticks: {
              callback: (v) =>
                stayMode === "savings" ? v + "%" : "$" + v,
              font: { family: "IBM Plex Sans", size: 11 },
              color: "#7a7870",
            },
            border: { display: false },
          },
        },
      },
    },
  );

  // ─── CITY SUMMARY TABLE
  const citySummaryBody = document.getElementById("citySummaryBody");
  citySummaryBody.innerHTML = cities
    .map((city) => {
      const rows = DATA.filter((d) => d.city === city);
      const avgCityCIT = avg(rows, "cit");
      const avgCityTrip = avg(rows, "trip");
      const avgCityBook = avg(rows, "booking");
      const avgCitySavTrip = avg(rows, "savingsTrip");
      const avgCitySavBook = avg(rows, "savingsBooking");
      return `
        <tr>
          <td class="hotel-name">${city}</td>
          <td><span class="price-cit">$${avgCityCIT.toFixed(0)}</span></td>
          <td><span class="price-other">$${avgCityTrip.toFixed(0)}</span></td>
          <td><span class="price-other">$${avgCityBook.toFixed(0)}</span></td>
          <td><span class="savings-pill ${savingsClass(avgCitySavTrip)}">${avgCitySavTrip >= 0 ? "+" : ""}${avgCitySavTrip.toFixed(1)}%</span></td>
          <td><span class="savings-pill ${savingsClass(avgCitySavBook)}">${avgCitySavBook >= 0 ? "+" : ""}${avgCitySavBook.toFixed(1)}%</span></td>
        </tr>`;
    })
    .join("");

  // ─── FILTERS + TABLE
  const filterCountry = document.getElementById("filterCountry");
  const filterCity = document.getElementById("filterCity");
  const filterStars = document.getElementById("filterStars");
  const filterStay = document.getElementById("filterStay");
  const filterBedType = document.getElementById("filterBedType");
  const filterCancellation = document.getElementById("filterCancellation");
  const filterBreakfast = document.getElementById("filterBreakfast");
  const cityToggle = document.getElementById("cityChartToggle");
  const stayToggle = document.getElementById("stayChartToggle");

  function uniqueSorted(list) {
    return [...new Set(list.filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );
  }

  function buildCityMap(rows) {
    const map = new Map();
    rows.forEach((row) => {
      if (!row.country || !row.city) return;
      if (!map.has(row.country)) map.set(row.country, new Set());
      map.get(row.country).add(row.city);
    });
    return map;
  }

  const cityMap = buildCityMap(DATA);

  function populateCityOptions(country, selectedCity = "") {
    const allCities = uniqueSorted(DATA.map((d) => d.city));
    const cities = country
      ? uniqueSorted([...(cityMap.get(country) || [])])
      : allCities;

    filterCity.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All cities";
    filterCity.appendChild(allOption);

    cities.forEach((c) => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      filterCity.appendChild(o);
    });

    if (selectedCity && cities.includes(selectedCity)) {
      filterCity.value = selectedCity;
    } else {
      filterCity.value = "";
    }
  }

  uniqueSorted(DATA.map((d) => d.country)).forEach((c) => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    filterCountry.appendChild(o);
  });

  populateCityOptions("");

  ["2 Single Beds", "1 Double Bed", "1 Large Double Bed", "1 Extra-Large Double Bed"].forEach(
    (t) => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      filterBedType.appendChild(o);
    },
  );

  uniqueSorted(DATA.map((d) => d.freeCancellation)).forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    filterCancellation.appendChild(o);
  });

  uniqueSorted(DATA.map((d) => d.breakfastIncluded)).forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    filterBreakfast.appendChild(o);
  });

  function setToggle(toggleEl, onChange) {
    toggleEl.querySelectorAll(".toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        toggleEl
          .querySelectorAll(".toggle-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        onChange(btn.dataset.mode);
      });
    });
  }

  setToggle(cityToggle, (mode) => {
    cityMode = mode;
    cityChart.data = cityChartData(mode);
    cityChart.update();
  });

  setToggle(stayToggle, (mode) => {
    stayMode = mode;
    stayChart.data = stayChartData(mode);
    stayChart.update();
  });

  let currentSort = "savings_trip";
  let currentPage = 1;
  const PER_PAGE = 15;

  function getFiltered() {
    let rows = [...DATA];
    if (filterCountry.value)
      rows = rows.filter((d) => d.country === filterCountry.value);
    if (filterCity.value) rows = rows.filter((d) => d.city === filterCity.value);
    if (filterStars.value)
      rows = rows.filter((d) => d.stars === +filterStars.value);
    if (filterStay.value) rows = rows.filter((d) => d.stay === filterStay.value);
    if (filterBedType.value)
      rows = rows.filter((d) =>
        d.bedType
          .toLowerCase()
          .includes(filterBedType.value.toLowerCase()),
      );
    if (filterCancellation.value)
      rows = rows.filter((d) => d.freeCancellation === filterCancellation.value);
    if (filterBreakfast.value)
      rows = rows.filter((d) => d.breakfastIncluded === filterBreakfast.value);
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

  function groupByHotel(rows) {
    const map = new Map();
    rows.forEach((row) => {
      const key = `${row.hotel}||${row.city}`;
      if (!map.has(key)) {
        map.set(key, { key, hotel: row.hotel, city: row.city, rows: [] });
      }
      map.get(key).rows.push(row);
    });
    return [...map.values()];
  }

  function pickGroupRow(group) {
    if (currentSort === "price_desc") {
      return group.rows.reduce((best, row) =>
        row.cit > best.cit ? row : best,
      );
    }
    if (currentSort === "price_asc") {
      return group.rows.reduce((best, row) =>
        row.cit < best.cit ? row : best,
      );
    }
    if (currentSort === "savings_booking") {
      return group.rows.reduce((best, row) =>
        row.savingsBooking > best.savingsBooking ? row : best,
      );
    }
    return group.rows.reduce((best, row) =>
      row.savingsTrip > best.savingsTrip ? row : best,
    );
  }

  function formatValue(value) {
    return value ? value : "N/A";
  }

  function render() {
    const filtered = getFiltered();
    const grouped = groupByHotel(filtered);
    const sortedGroups = grouped.sort((a, b) => {
      const aRow = pickGroupRow(a);
      const bRow = pickGroupRow(b);
      if (currentSort === "savings_trip")
        return bRow.savingsTrip - aRow.savingsTrip;
      if (currentSort === "savings_booking")
        return bRow.savingsBooking - aRow.savingsBooking;
      if (currentSort === "price_asc") return aRow.cit - bRow.cit;
      if (currentSort === "price_desc") return bRow.cit - aRow.cit;
      return 0;
    });

    const total = sortedGroups.length;
    const pages = Math.ceil(total / PER_PAGE);
    if (currentPage > pages) currentPage = 1;
    const slice = sortedGroups.slice(
      (currentPage - 1) * PER_PAGE,
      currentPage * PER_PAGE,
    );

    document.getElementById("tableCount").textContent = total + " hotels";
    document.getElementById("tableInfo").textContent =
      `Showing ${(currentPage - 1) * PER_PAGE + 1}–${Math.min(currentPage * PER_PAGE, total)} of ${total}`;

    const tbody = document.getElementById("tableBody");
    tbody.innerHTML =
      slice.length === 0
        ? '<tr><td colspan="9"><div class="no-results">No hotels match your filters.</div></td></tr>'
        : slice
            .map((group, groupIndex) => {
              const row = pickGroupRow(group);
              const groupId = `group-${currentPage}-${groupIndex}`;
              const hasVariants = group.rows.length > 1;
              const variantCount = group.rows.length;
              const detailRows = group.rows
                .map(
                  (d) => `
                  <tr>
                    <td>${formatValue(d.roomType)}</td>
                    <td>${formatValue(d.bedType)}</td>
                    <td>${formatValue(d.freeCancellation)}</td>
                    <td>${formatValue(d.breakfastIncluded)}</td>
                    <td><span class="price-cit">$${d.cit.toFixed(0)}</span></td>
                    <td><span class="price-other">$${d.trip.toFixed(0)}</span></td>
                    <td><span class="price-other">$${d.booking.toFixed(0)}</span></td>
                    <td><span class="savings-pill ${savingsClass(d.savingsTrip)}">${d.savingsTrip >= 0 ? "+" : ""}${d.savingsTrip.toFixed(1)}%</span></td>
                    <td><span class="savings-pill ${savingsClass(d.savingsBooking)}">${d.savingsBooking >= 0 ? "+" : ""}${d.savingsBooking.toFixed(1)}%</span></td>
                  </tr>`,
                )
                .join("");
              return `
          <tr class="group-row" data-group="${groupId}">
            <td class="hotel-name">${row.hotel}</td>
            <td><span class="city-badge">${row.city}</span></td>
            <td><span class="stars">${"★".repeat(row.stars)}</span></td>
            <td><span class="price-cit">$${row.cit.toFixed(0)}</span></td>
            <td><span class="price-other">$${row.trip.toFixed(0)}</span></td>
            <td class="price-other-col"><span class="price-other">$${row.booking.toFixed(0)}</span></td>
            <td><span class="savings-pill ${savingsClass(row.savingsTrip)}">${row.savingsTrip >= 0 ? "+" : ""}${row.savingsTrip.toFixed(1)}%</span></td>
            <td><span class="savings-pill ${savingsClass(row.savingsBooking)}">${row.savingsBooking >= 0 ? "+" : ""}${row.savingsBooking.toFixed(1)}%</span></td>
            <td class="group-toggle-cell">
              ${
                hasVariants
                  ? `<button class="group-toggle" data-target="${groupId}" data-count="${variantCount}" aria-expanded="false" aria-label="Show ${variantCount} options">${variantCount} ▾</button>`
                  : ""
              }
            </td>
          </tr>
          ${
            hasVariants
              ? `
          <tr class="group-details" data-group-details="${groupId}" style="display:none">
            <td colspan="9">
              <div class="variant-wrap">
                <table class="variant-table">
                  <thead>
                    <tr>
                      <th>Room Type</th>
                      <th>Bed Type</th>
                      <th>Free Cancellation</th>
                      <th>Breakfast</th>
                      <th>CIT</th>
                      <th>Trip.com</th>
                      <th>Booking.com</th>
                      <th>Save vs Trip</th>
                      <th>Save vs Booking</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${detailRows}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>`
              : ""
          }`;
            })
            .join("");

    tbody.querySelectorAll(".group-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        const count = btn.dataset.count;
        const details = tbody.querySelector(
          `[data-group-details="${target}"]`,
        );
        const isOpen = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!isOpen));
        btn.textContent = isOpen ? `${count} ▾` : `${count} ▴`;
        if (details) details.style.display = isOpen ? "none" : "table-row";
      });
    });

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

  filterCountry.addEventListener("change", () => {
    populateCityOptions(filterCountry.value, "");
    currentPage = 1;
    render();
  });

  filterCity.addEventListener("change", () => {
    if (filterCity.value) {
      const match = DATA.find((d) => d.city === filterCity.value);
      if (match) {
        filterCountry.value = match.country;
        populateCityOptions(match.country, filterCity.value);
      }
    }
    currentPage = 1;
    render();
  });

  [
    filterStars,
    filterStay,
    filterBedType,
    filterCancellation,
    filterBreakfast,
  ].forEach((el) => {
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
