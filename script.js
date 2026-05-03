function formatMoney(value) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD"
  }).format(value);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getBalloonPercentage(termMonths, useBalloon, fortyEightBalloonPct) {
  if (!useBalloon) {
    return 0;
  }

  if (termMonths === 36) {
    return 0.45;
  }

  if (termMonths === 48) {
    return fortyEightBalloonPct / 100;
  }

  if (termMonths === 60) {
    return 0.25;
  }

  return 0;
}

function calculateRepayment(amountFinanced, annualRate, termMonths, balloon, paymentsPerYear) {
  const years = termMonths / 12;
  const totalPayments = Math.round(years * paymentsPerYear);
  const periodRate = annualRate / 100 / paymentsPerYear;

  if (amountFinanced <= 0 || totalPayments <= 0 || balloon < 0 || balloon >= amountFinanced) {
    return 0;
  }

  if (periodRate === 0) {
    return (amountFinanced - balloon) / totalPayments;
  }

  const presentValueOfBalloon = balloon / Math.pow(1 + periodRate, totalPayments);

  const repayment =
    (amountFinanced - presentValueOfBalloon) *
    periodRate /
    (1 - Math.pow(1 + periodRate, -totalPayments));

  return repayment;
}

function buildOption(amountFinanced, vehiclePrice, annualRate, termMonths, useBalloon, fortyEightBalloonPct) {
  const balloonPct = getBalloonPercentage(termMonths, useBalloon, fortyEightBalloonPct);
  const balloonAmount = vehiclePrice * balloonPct;

  if (balloonAmount >= amountFinanced) {
    return {
      termMonths,
      balloonPct,
      balloonAmount,
      monthlyRepayment: 0,
      fortnightlyRepayment: 0,
      weeklyRepayment: 0,
      valid: false
    };
  }

  const monthlyRepayment = calculateRepayment(amountFinanced, annualRate, termMonths, balloonAmount, 12);
  const fortnightlyRepayment = calculateRepayment(amountFinanced, annualRate, termMonths, balloonAmount, 26);
  const weeklyRepayment = calculateRepayment(amountFinanced, annualRate, termMonths, balloonAmount, 52);

  return {
    termMonths,
    balloonPct,
    balloonAmount,
    monthlyRepayment,
    fortnightlyRepayment,
    weeklyRepayment,
    valid: true
  };
}

function renderComparisonTable(options, selectedTerm) {
  const comparisonBody = document.getElementById("comparisonBody");
  comparisonBody.innerHTML = "";

  options.forEach((option) => {
    const row = document.createElement("tr");

    if (option.termMonths === selectedTerm) {
      row.classList.add("selected-row");
    }

    if (!option.valid) {
      row.innerHTML = `
        <td>${option.termMonths} months</td>
        <td>${(option.balloonPct * 100).toFixed(0)}%</td>
        <td>${formatMoney(option.balloonAmount)}</td>
        <td colspan="3">Not available</td>
      `;
    } else {
      row.innerHTML = `
        <td>${option.termMonths} months</td>
        <td>${(option.balloonPct * 100).toFixed(0)}%</td>
        <td>${formatMoney(option.balloonAmount)}</td>
        <td>${formatMoney(option.monthlyRepayment)}</td>
        <td>${formatMoney(option.fortnightlyRepayment)}</td>
        <td>${formatMoney(option.weeklyRepayment)}</td>
      `;
    }

    comparisonBody.appendChild(row);
  });
}

function buildCustomerSummary(vehiclePrice, deposit, tradeIn, amountFinanced, rate, selectedOption, useBalloon) {
  const lines = [
    "Finance Quote Estimate",
    "",
    `Vehicle price: ${formatMoney(vehiclePrice)}`,
    `Deposit: ${formatMoney(deposit)}`,
    `Trade-in equity: ${formatMoney(tradeIn)}`,
    `Amount financed: ${formatMoney(amountFinanced)}`,
    `Rate: ${rate.toFixed(2)}% p.a.`,
    "",
    `Based on this structure, your estimated weekly repayment would be ${formatMoney(selectedOption.weeklyRepayment)} over ${selectedOption.termMonths} months.`
  ];

  if (useBalloon && selectedOption.balloonAmount > 0) {
    lines.push(
      `This option includes a balloon payment of ${formatMoney(selectedOption.balloonAmount)} (${(selectedOption.balloonPct * 100).toFixed(0)}%) at the end of the term.`
    );
  }

  lines.push(
    "",
    "This is an estimate only and is subject to lender approval, final fees, terms and disclosure."
  );

  return lines.join("\n");
}

function calculateQuote() {
  const vehiclePrice = parseFloat(document.getElementById("vehiclePrice").value) || 0;
  const orc = parseFloat(document.getElementById("orc").value) || 0;
  const fees = parseFloat(document.getElementById("fees").value) || 0;
  const deposit = parseFloat(document.getElementById("deposit").value) || 0;
  const tradeIn = parseFloat(document.getElementById("tradeIn").value) || 0;
  const rate = parseFloat(document.getElementById("rate").value) || 0;
  const selectedTerm = parseInt(document.getElementById("selectedTerm").value, 10) || 60;
  const useBalloon = document.getElementById("useBalloon").value === "yes";
  const fortyEightBalloonPct = parseFloat(document.getElementById("fortyEightBalloonPct").value) || 35;

  const amountFinanced = vehiclePrice + orc + fees - deposit - tradeIn;

  if (vehiclePrice <= 0) {
    alert("Vehicle price must be more than $0.");
    return;
  }

  if (amountFinanced <= 0) {
    alert("Amount financed must be more than $0.");
    return;
  }

  const terms = [36, 48, 60];
  const options = terms.map((term) =>
    buildOption(amountFinanced, vehiclePrice, rate, term, useBalloon, fortyEightBalloonPct)
  );

  document.getElementById("amountFinanced").textContent = formatMoney(amountFinanced);
  renderComparisonTable(options, selectedTerm);

  const selectedOption = options.find((option) => option.termMonths === selectedTerm);

  if (!selectedOption || !selectedOption.valid) {
    document.getElementById("quoteSummary").value =
      "Selected option is not available with the current structure.";
    return;
  }

  const summary = buildCustomerSummary(
    vehiclePrice,
    deposit,
    tradeIn,
    amountFinanced,
    rate,
    selectedOption,
    useBalloon
  );

  document.getElementById("quoteSummary").value = summary;
}

function copySummary() {
  const text = document.getElementById("quoteSummary").value;

  if (!text) {
    alert("Please calculate a quote first.");
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    alert("Quote summary copied.");
  }).catch(() => {
    alert("Copy failed. Please copy the text manually.");
  });
}

function printQuote() {
  const summary = document.getElementById("quoteSummary").value;
  const amountFinanced = document.getElementById("amountFinanced").textContent;
  const tableHtml = document.querySelector(".comparison-table").outerHTML;

  if (!summary) {
    alert("Please calculate a quote first.");
    return;
  }

  const printWindow = window.open("", "_blank", "width=1100,height=850");

  if (!printWindow) {
    alert("Pop-up blocked. Please allow pop-ups and try again.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Jacky's Finance Tool - Quote</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 32px;
          color: #111827;
        }

        h1 {
          margin: 0 0 16px 0;
          font-size: 30px;
        }

        h2 {
          margin: 24px 0 10px 0;
          font-size: 20px;
        }

        .amount-line {
          font-size: 18px;
          margin-bottom: 16px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin-top: 10px;
        }

        th, td {
          border: 1px solid #d1d5db;
          padding: 9px 10px;
          text-align: left;
          white-space: nowrap;
        }

        th {
          background: #111827;
          color: #ffffff;
        }

        tr.selected-row td {
          background: #eaf3ff !important;
          font-weight: 700;
        }

        pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 14px;
          background: #f8fafc;
          font-size: 14px;
          line-height: 1.45;
        }

        .footer {
          margin-top: 18px;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <h1>Jacky's Finance Tool</h1>
      <div class="amount-line"><strong>Amount financed:</strong> ${escapeHtml(amountFinanced)}</div>

      <h2>Internal Comparison</h2>
      ${tableHtml}

      <h2>Customer Quote Summary</h2>
      <pre>${escapeHtml(summary)}</pre>

      <div class="footer">
        Generated from Jacky's Finance Tool
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 300);
}

function resetQuote() {
  document.getElementById("vehiclePrice").value = 35000;
  document.getElementById("orc").value = 0;
  document.getElementById("fees").value = 495;
  document.getElementById("deposit").value = 5000;
  document.getElementById("tradeIn").value = 0;
  document.getElementById("rate").value = 10.6;
  document.getElementById("useBalloon").value = "yes";
  document.getElementById("fortyEightBalloonPct").value = "35";
  document.getElementById("selectedTerm").value = "60";

  document.getElementById("amountFinanced").textContent = "$0.00";
  document.getElementById("comparisonBody").innerHTML = `
    <tr>
      <td colspan="6">Click Calculate Quote to show options.</td>
    </tr>
  `;
  document.getElementById("quoteSummary").value = "";
}