function formatMoney(value) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD"
  }).format(value);
}

function getBalloonPercentage(termMonths) {
  const balloonMap = {
    36: 0.45,
    48: 0.35,
    60: 0.25
  };

  return balloonMap[termMonths] || 0;
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

function buildOption(amountFinanced, vehiclePrice, annualRate, termMonths) {
  const balloonPct = getBalloonPercentage(termMonths);
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
  const options = terms.map(term => buildOption(amountFinanced, vehiclePrice, rate, term));

  document.getElementById("amountFinanced").textContent = formatMoney(amountFinanced);

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

  const summary = `
Finance Quote Estimate

Vehicle price: ${formatMoney(vehiclePrice)}
Deposit: ${formatMoney(deposit)}
Trade-in equity: ${formatMoney(tradeIn)}
Amount financed: ${formatMoney(amountFinanced)}

Rate: ${rate.toFixed(2)}% p.a.
Term: ${selectedOption.termMonths} months
Estimated weekly repayment: ${formatMoney(selectedOption.weeklyRepayment)}

This is an estimate only and is subject to lender approval, final fees, terms and disclosure.
  `.trim();

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