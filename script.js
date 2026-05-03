function formatMoney(value) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD"
  }).format(value);
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

function calculateQuote() {
  const vehiclePrice = parseFloat(document.getElementById("vehiclePrice").value) || 0;
  const orc = parseFloat(document.getElementById("orc").value) || 0;
  const fees = parseFloat(document.getElementById("fees").value) || 0;
  const deposit = parseFloat(document.getElementById("deposit").value) || 0;
  const tradeIn = parseFloat(document.getElementById("tradeIn").value) || 0;
  const rate = parseFloat(document.getElementById("rate").value) || 0;
  const selectedTerm = parseInt(document.getElementById("selectedTerm").value) || 60;
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
  const options = terms.map(term =>
    buildOption(amountFinanced, vehiclePrice, rate, term, useBalloon, fortyEightBalloonPct)
  );

  document.getElementById("amountFinanced").textContent = formatMoney(amountFinanced);

  const balloonModeNote = document.getElementById("balloonModeNote");
  if (useBalloon) {
    balloonModeNote.textContent =
      `Balloon is on: 36 months = 45%, 48 months = ${fortyEightBalloonPct}%, 60 months = 25%`;
  } else {
    balloonModeNote.textContent =
      "Balloon is off: all options shown with no balloon.";
  }

  const comparisonBody = document.getElementById("comparisonBody");
  comparisonBody.innerHTML = "";

  options.forEach(option => {
    const row = document.createElement("tr");

    if (!option.valid) {
      row.innerHTML = `
        <td>${option.termMonths} months</td>
        <td>${(option.balloonPct * 100).toFixed(0)}%</td>
        <td>${formatMoney(option.balloonAmount)}</td>
        <td colspan="3">Not available with current structure</td>
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

  const selectedOption = options.find(option => option.termMonths === selectedTerm);

  if (!selectedOption || !selectedOption.valid) {
    document.getElementById("quoteSummary").value =
      "Selected option is not available with the current structure.";
    return;
  }

  let summary = `
Finance Quote Estimate

Vehicle price: ${formatMoney(vehiclePrice)}
Deposit: ${formatMoney(deposit)}
Trade-in equity: ${formatMoney(tradeIn)}
Amount financed: ${formatMoney(amountFinanced)}

Rate: ${rate.toFixed(2)}% p.a.
Term: ${selectedOption.termMonths} months
`.trim();

  if (useBalloon && selectedOption.balloonAmount > 0) {
    summary += `\nBalloon: ${formatMoney(selectedOption.balloonAmount)} (${(selectedOption.balloonPct * 100).toFixed(0)}%)`;
  }

  summary += `\nEstimated weekly repayment: ${formatMoney(selectedOption.weeklyRepayment)}`;
  summary += `\n\nThis is an estimate only and is subject to lender approval, final fees, terms and disclosure.`;

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
}function resetQuote() {
  document.getElementById("vehiclePrice").value = 35000;
  document.getElementById("orc").value = 0;
  document.getElementById("fees").value = 495;
  document.getElementById("deposit").value = 5000;
  document.getElementById("tradeIn").value = 0;
  document.getElementById("rate").value = 10.6;
  document.getElementById("useBalloon").value = "yes";
  document.getElementById("fortyEightBalloonPct").value = 35;
  document.getElementById("selectedTerm").value = 60;

  document.getElementById("amountFinanced").textContent = "$0.00";
  document.getElementById("balloonModeNote").textContent = "Balloon is auto-set internally.";

  document.getElementById("comparisonBody").innerHTML = `
    <tr>
      <td colspan="6">Click Calculate Quote to show options.</td>
    </tr>
  `;

  document.getElementById("quoteSummary").value = "";
}