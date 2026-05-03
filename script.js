let currentMode = "quote";

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

function calculateMaxVehiclePriceFromWeeklyBudget(weeklyBudget, deposit, tradeIn, annualRate, termMonths, balloonPct) {
  const paymentsPerYear = 52;
  const years = termMonths / 12;
  const totalPayments = Math.round(years * paymentsPerYear);
  const periodRate = annualRate / 100 / paymentsPerYear;
  const customerContribution = deposit + tradeIn;

  if (weeklyBudget <= 0 || totalPayments <= 0) {
    return {
      maxVehiclePrice: 0,
      maxAmountFinanced: 0,
      balloonAmount: 0
    };
  }

  let maxVehiclePrice = 0;

  if (periodRate === 0) {
    const denominator = 1 - balloonPct;

    if (denominator <= 0) {
      return {
        maxVehiclePrice: 0,
        maxAmountFinanced: 0,
        balloonAmount: 0
      };
    }

    maxVehiclePrice = ((weeklyBudget * totalPayments) + customerContribution) / denominator;
  } else {
    const discountFactor = Math.pow(1 + periodRate, totalPayments);
    const repaymentFactor = periodRate / (1 - Math.pow(1 + periodRate, -totalPayments));
    const denominator = 1 - (balloonPct / discountFactor);

    if (denominator <= 0 || repaymentFactor <= 0) {
      return {
        maxVehiclePrice: 0,
        maxAmountFinanced: 0,
        balloonAmount: 0
      };
    }

    maxVehiclePrice = ((weeklyBudget / repaymentFactor) + customerContribution) / denominator;
  }

  const balloonAmount = maxVehiclePrice * balloonPct;
  const maxAmountFinanced = maxVehiclePrice - customerContribution;

  return {
    maxVehiclePrice,
    maxAmountFinanced,
    balloonAmount
  };
}

function buildQuoteOption(amountFinanced, vehiclePrice, annualRate, termMonths, useBalloon, fortyEightBalloonPct) {
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

function buildBudgetOption(weeklyBudget, deposit, tradeIn, annualRate, termMonths, useBalloon, fortyEightBalloonPct) {
  const balloonPct = getBalloonPercentage(termMonths, useBalloon, fortyEightBalloonPct);
  const result = calculateMaxVehiclePriceFromWeeklyBudget(
    weeklyBudget,
    deposit,
    tradeIn,
    annualRate,
    termMonths,
    balloonPct
  );

  if (result.maxVehiclePrice <= 0 || result.maxAmountFinanced <= 0) {
    return {
      termMonths,
      balloonPct,
      balloonAmount: 0,
      maxAmountFinanced: 0,
      maxVehiclePrice: 0,
      valid: false
    };
  }

  return {
    termMonths,
    balloonPct,
    balloonAmount: result.balloonAmount,
    maxAmountFinanced: result.maxAmountFinanced,
    maxVehiclePrice: result.maxVehiclePrice,
    valid: true
  };
}

function renderQuoteTable(options, selectedTerm) {
  document.getElementById("comparisonTitle").textContent = "Internal Comparison";

  document.getElementById("comparisonHead").innerHTML = `
    <tr>
      <th>Term</th>
      <th>Balloon %</th>
      <th>Balloon $</th>
      <th>Monthly</th>
      <th>Fortnightly</th>
      <th>Weekly</th>
    </tr>
  `;

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

function renderBudgetTable(options, selectedTerm) {
  document.getElementById("comparisonTitle").textContent = "Budget Guide";

  document.getElementById("comparisonHead").innerHTML = `
    <tr>
      <th>Term</th>
      <th>Balloon %</th>
      <th>Balloon $</th>
      <th>Max amount financed</th>
      <th>Estimated max vehicle price</th>
    </tr>
  `;

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
        <td>${formatMoney(0)}</td>
        <td colspan="2">Not available</td>
      `;
    } else {
      row.innerHTML = `
        <td>${option.termMonths} months</td>
        <td>${(option.balloonPct * 100).toFixed(0)}%</td>
        <td>${formatMoney(option.balloonAmount)}</td>
        <td>${formatMoney(option.maxAmountFinanced)}</td>
        <td>${formatMoney(option.maxVehiclePrice)}</td>
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

function calculateQuoteMode() {
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
    buildQuoteOption(amountFinanced, vehiclePrice, rate, term, useBalloon, fortyEightBalloonPct)
  );

  document.getElementById("amountFinanced").textContent = formatMoney(amountFinanced);
  renderQuoteTable(options, selectedTerm);

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

function calculateBudgetMode() {
  const weeklyBudget = parseFloat(document.getElementById("weeklyBudget").value) || 0;
  const deposit = parseFloat(document.getElementById("deposit").value) || 0;
  const tradeIn = parseFloat(document.getElementById("tradeIn").value) || 0;
  const rate = parseFloat(document.getElementById("rate").value) || 0;
  const selectedTerm = parseInt(document.getElementById("selectedTerm").value, 10) || 60;
  const useBalloon = document.getElementById("useBalloon").value === "yes";
  const fortyEightBalloonPct = parseFloat(document.getElementById("fortyEightBalloonPct").value) || 35;

  if (weeklyBudget <= 0) {
    alert("Weekly budget must be more than $0.");
    return;
  }

  const terms = [36, 48, 60];
  const options = terms.map((term) =>
    buildBudgetOption(weeklyBudget, deposit, tradeIn, rate, term, useBalloon, fortyEightBalloonPct)
  );

  renderBudgetTable(options, selectedTerm);

  const selectedOption = options.find((option) => option.termMonths === selectedTerm);

  if (!selectedOption || !selectedOption.valid) {
    document.getElementById("maxVehiclePrice").textContent = "$0.00";
    document.getElementById("budgetResultNote").textContent = "Selected option is not available.";
    return;
  }

  document.getElementById("maxVehiclePrice").textContent = formatMoney(selectedOption.maxVehiclePrice);

  let note = `Based on ${formatMoney(weeklyBudget)} per week over ${selectedOption.termMonths} months.`;

  if (useBalloon && selectedOption.balloonAmount > 0) {
    note += ` Includes estimated balloon of ${formatMoney(selectedOption.balloonAmount)}.`;
  }

  document.getElementById("budgetResultNote").textContent = note;
}

function calculateQuote() {
  if (currentMode === "budget") {
    calculateBudgetMode();
  } else {
    calculateQuoteMode();
  }
}

function updateWeeklyBudgetDisplay() {
  const weeklyBudget = parseFloat(document.getElementById("weeklyBudget").value) || 0;
  document.getElementById("weeklyBudgetDisplay").textContent = `${formatMoney(weeklyBudget)}/week`;

  if (currentMode === "budget") {
    calculateBudgetMode();
  }
}

function setMode(mode) {
  currentMode = mode;

  const isBudgetMode = mode === "budget";

  document.getElementById("quoteModeBtn").classList.toggle("active", !isBudgetMode);
  document.getElementById("budgetModeBtn").classList.toggle("active", isBudgetMode);

  document.querySelectorAll(".quote-only").forEach((element) => {
    element.classList.toggle("hidden", isBudgetMode);
  });

  document.querySelectorAll(".budget-only").forEach((element) => {
    element.classList.toggle("hidden", !isBudgetMode);
  });

  document.querySelectorAll(".quote-result").forEach((element) => {
    element.classList.toggle("hidden", isBudgetMode);
  });

  document.querySelectorAll(".budget-result").forEach((element) => {
    element.classList.toggle("hidden", !isBudgetMode);
  });

  document.getElementById("customerSummarySection").classList.toggle("hidden", isBudgetMode);
  document.getElementById("budgetGuideSection").classList.toggle("hidden", !isBudgetMode);

  resetResultsOnly();

  if (isBudgetMode) {
    updateWeeklyBudgetDisplay();
    calculateBudgetMode();
  }
}

function resetResultsOnly() {
  document.getElementById("amountFinanced").textContent = "$0.00";
  document.getElementById("maxVehiclePrice").textContent = "$0.00";
  document.getElementById("budgetResultNote").textContent = "Select Budget Mode and calculate.";
  document.getElementById("quoteSummary").value = "";

  if (currentMode === "budget") {
    document.getElementById("comparisonTitle").textContent = "Budget Guide";
    document.getElementById("comparisonHead").innerHTML = `
      <tr>
        <th>Term</th>
        <th>Balloon %</th>
        <th>Balloon $</th>
        <th>Max amount financed</th>
        <th>Estimated max vehicle price</th>
      </tr>
    `;
    document.getElementById("comparisonBody").innerHTML = `
      <tr>
        <td colspan="5">Adjust the weekly budget slider to show options.</td>
      </tr>
    `;
  } else {
    document.getElementById("comparisonTitle").textContent = "Internal Comparison";
    document.getElementById("comparisonHead").innerHTML = `
      <tr>
        <th>Term</th>
        <th>Balloon %</th>
        <th>Balloon $</th>
        <th>Monthly</th>
        <th>Fortnightly</th>
        <th>Weekly</th>
      </tr>
    `;
    document.getElementById("comparisonBody").innerHTML = `
      <tr>
        <td colspan="6">Click Calculate to show options.</td>
      </tr>
    `;
  }
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
  document.getElementById("weeklyBudget").value = 200;
  document.getElementById("deposit").value = 5000;
  document.getElementById("tradeIn").value = 0;
  document.getElementById("rate").value = 10.6;
  document.getElementById("useBalloon").value = "yes";
  document.getElementById("fortyEightBalloonPct").value = "35";
  document.getElementById("selectedTerm").value = "60";

  updateWeeklyBudgetDisplay();
  resetResultsOnly();

  if (currentMode === "budget") {
    calculateBudgetMode();
  }
}

updateWeeklyBudgetDisplay();