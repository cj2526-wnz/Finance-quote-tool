function formatMoney(value) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD"
  }).format(value);
}

function calculateRepayment(amountFinanced, annualRate, termMonths, balloon, paymentsPerYear) {
  const years = termMonths / 12;
  const totalPayments = Math.round(years * paymentsPerYear);
  const periodRate = annualRate / 100 / paymentsPerYear;
  const principalToAmortise = amountFinanced - balloon;

  if (amountFinanced <= 0 || principalToAmortise < 0 || totalPayments <= 0) {
    return 0;
  }

  if (periodRate === 0) {
    return principalToAmortise / totalPayments;
  }

  const repayment =
    principalToAmortise *
    (periodRate * Math.pow(1 + periodRate, totalPayments)) /
    (Math.pow(1 + periodRate, totalPayments) - 1);

  return repayment;
}

function calculateQuote() {
  const vehiclePrice = parseFloat(document.getElementById("vehiclePrice").value) || 0;
  const orc = parseFloat(document.getElementById("orc").value) || 0;
  const fees = parseFloat(document.getElementById("fees").value) || 0;
  const deposit = parseFloat(document.getElementById("deposit").value) || 0;
  const tradeIn = parseFloat(document.getElementById("tradeIn").value) || 0;
  const rate = parseFloat(document.getElementById("rate").value) || 0;
  const termMonths = parseInt(document.getElementById("termMonths").value) || 0;
  const balloon = parseFloat(document.getElementById("balloon").value) || 0;

  const amountFinanced = vehiclePrice + orc + fees - deposit - tradeIn;

  if (amountFinanced <= 0) {
    alert("Amount financed must be more than $0.");
    return;
  }

  if (balloon >= amountFinanced) {
    alert("Balloon must be lower than the amount financed.");
    return;
  }

  const monthlyRepayment = calculateRepayment(amountFinanced, rate, termMonths, balloon, 12);
  const fortnightlyRepayment = calculateRepayment(amountFinanced, rate, termMonths, balloon, 26);
  const weeklyRepayment = calculateRepayment(amountFinanced, rate, termMonths, balloon, 52);

  const totalMonthlyPaid = monthlyRepayment * termMonths;
  const totalPaid = totalMonthlyPaid + balloon;
  const totalInterest = totalPaid - amountFinanced;

  document.getElementById("amountFinanced").textContent = formatMoney(amountFinanced);
  document.getElementById("monthlyRepayment").textContent = formatMoney(monthlyRepayment);
  document.getElementById("fortnightlyRepayment").textContent = formatMoney(fortnightlyRepayment);
  document.getElementById("weeklyRepayment").textContent = formatMoney(weeklyRepayment);
  document.getElementById("totalInterest").textContent = formatMoney(totalInterest);
  document.getElementById("totalPaid").textContent = formatMoney(totalPaid);

  const summary = `
Finance Quote Estimate

Vehicle price: ${formatMoney(vehiclePrice)}
ORC: ${formatMoney(orc)}
Other fees: ${formatMoney(fees)}
Deposit: ${formatMoney(deposit)}
Trade-in equity: ${formatMoney(tradeIn)}
Amount financed: ${formatMoney(amountFinanced)}

Rate: ${rate.toFixed(2)}% p.a.
Term: ${termMonths} months
Balloon: ${formatMoney(balloon)}

Estimated monthly repayment: ${formatMoney(monthlyRepayment)}
Estimated fortnightly repayment: ${formatMoney(fortnightlyRepayment)}
Estimated weekly repayment: ${formatMoney(weeklyRepayment)}

Estimated total interest: ${formatMoney(totalInterest)}
Estimated total paid incl. balloon: ${formatMoney(totalPaid)}

This is an estimate only and is subject to lender approval, final fees, terms and disclosure.
  `.trim();

  document.getElementById("quoteSummary").value = summary;
}

function copySummary() {
  const text = document.getElementById("quoteSummary").value;
  navigator.clipboard.writeText(text).then(() => {
    alert("Quote summary copied.");
  });
}