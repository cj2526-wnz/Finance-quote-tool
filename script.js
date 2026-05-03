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

  const balloonPct = getBalloonPercentage(selectedTerm, useBalloon, fortyEightBalloonPct);
  const balloonAmount = vehiclePrice * balloonPct;

  if (balloonAmount >= amountFinanced) {
    alert("Balloon must be lower than the amount financed.");
    return;
  }

  const weeklyRepayment = calculateRepayment(amountFinanced, rate, selectedTerm, balloonAmount, 52);

  document.getElementById("amountFinanced").textContent = formatMoney(amountFinanced);

  let summary = `
Vehicle price: ${formatMoney(vehiclePrice)}
Deposit: ${formatMoney(deposit)}
Trade-in equity: ${formatMoney(tradeIn)}
Amount financed: ${formatMoney(amountFinanced)}

Rate: ${rate.toFixed(2)}% p.a.
Term: ${selectedTerm} months
`.trim();

  if (useBalloon && balloonAmount > 0) {
    summary += `\nBalloon: ${formatMoney(balloonAmount)} (${(balloonPct * 100).toFixed(0)}%)`;
  }

  summary += `\nEstimated weekly repayment: ${formatMoney(weeklyRepayment)}`;
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
  document.getElementById("quoteSummary").value = "";
}