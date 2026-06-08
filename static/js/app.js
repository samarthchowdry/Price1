(function () {
  const form = document.getElementById("calculator-form");
  const errorEl = document.getElementById("error-message");
  const resultSection = document.getElementById("result-section");
  const priceBanner = document.getElementById("price-banner");
  const priceBannerValue = document.getElementById("price-banner-value");
  const calculateBtn = document.getElementById("calculate-btn");
  const makingType = document.getElementById("making_charge_type");
  const makingLabel = document.getElementById("making-label");

  if (!form || !calculateBtn || !resultSection) {
    return;
  }

  const fieldNames = [
    "gross_weight_grams",
    "stone_weight_grams",
    "purity",
    "silver_rate_per_gram",
    "making_charge_type",
    "making_charge_value",
    "wastage_percent",
    "gst_percent",
  ];

  const fields = {
    totalPrice: document.getElementById("total-price"),
    grossWeight: document.getElementById("res-gross-weight"),
    stoneWeight: document.getElementById("res-stone-weight"),
    netWeight: document.getElementById("res-net-weight"),
    purity: document.getElementById("res-purity"),
    pureWeight: document.getElementById("res-pure-weight"),
    rate: document.getElementById("res-rate"),
    silverValue: document.getElementById("res-silver-value"),
    making: document.getElementById("res-making"),
    wastage: document.getElementById("res-wastage"),
    subtotal: document.getElementById("res-subtotal"),
    gst: document.getElementById("res-gst"),
  };

  const makingLabels = {
    per_gram: "Making Charge (₹ per gram)",
    fixed: "Making Charge (₹ fixed)",
    percent: "Making Charge (%)",
  };

  function parseNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
      return null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : NaN;
  }

  function formatCurrency(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function updateMakingLabel() {
    if (makingLabel) {
      makingLabel.textContent = makingLabels[makingType.value] || makingLabels.per_gram;
    }
  }

  function showElement(el) {
    if (el) el.removeAttribute("hidden");
  }

  function hideElement(el) {
    if (el) el.setAttribute("hidden", "");
  }

  function clearFieldErrors() {
    fieldNames.forEach(function (name) {
      const wrapper = document.querySelector('[data-field="' + name + '"]');
      const errEl = document.getElementById("err-" + name);
      const input = document.getElementById(name);

      if (wrapper) wrapper.classList.remove("field--error");
      if (errEl) errEl.textContent = "";
      if (input) input.removeAttribute("aria-invalid");
    });
  }

  function setFieldError(fieldName, message) {
    const wrapper = document.querySelector('[data-field="' + fieldName + '"]');
    const errEl = document.getElementById("err-" + fieldName);
    const input = document.getElementById(fieldName);

    if (wrapper) wrapper.classList.add("field--error");
    if (errEl) errEl.textContent = message;
    if (input) {
      input.setAttribute("aria-invalid", "true");
      input.focus();
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function showError(message, fieldName) {
    if (errorEl) {
      errorEl.textContent = message;
      showElement(errorEl);
    }
    hideElement(resultSection);
    hideElement(priceBanner);

    clearFieldErrors();
    if (fieldName) {
      setFieldError(fieldName, message);
    } else if (errorEl) {
      errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function hideError() {
    hideElement(errorEl);
    if (errorEl) errorEl.textContent = "";
    clearFieldErrors();
  }

  function validateClient(payload) {
    const gross = parseNumber(payload.gross_weight_grams);
    if (gross === null) return { message: "Gross weight is required.", field: "gross_weight_grams" };
    if (Number.isNaN(gross)) return { message: "Gross weight must be a valid number.", field: "gross_weight_grams" };
    if (gross <= 0) return { message: "Gross weight must be greater than 0 grams.", field: "gross_weight_grams" };
    if (gross > 10000) return { message: "Gross weight cannot exceed 10,000 grams.", field: "gross_weight_grams" };

    const stone = parseNumber(payload.stone_weight_grams);
    if (stone === null) return { message: "Stone weight is required.", field: "stone_weight_grams" };
    if (Number.isNaN(stone)) return { message: "Stone weight must be a valid number.", field: "stone_weight_grams" };
    if (stone < 0) return { message: "Stone weight cannot be negative.", field: "stone_weight_grams" };
    if (stone >= gross) return { message: "Stone weight must be less than gross weight.", field: "stone_weight_grams" };

    const rate = parseNumber(payload.silver_rate_per_gram);
    if (rate === null) return { message: "Silver rate is required.", field: "silver_rate_per_gram" };
    if (Number.isNaN(rate)) return { message: "Silver rate must be a valid number.", field: "silver_rate_per_gram" };
    if (rate <= 0) return { message: "Silver rate must be greater than 0.", field: "silver_rate_per_gram" };
    if (rate > 100000) return { message: "Silver rate seems unreasonably high.", field: "silver_rate_per_gram" };

    const making = parseNumber(payload.making_charge_value);
    if (making === null) return { message: "Making charge is required.", field: "making_charge_value" };
    if (Number.isNaN(making)) return { message: "Making charge must be a valid number.", field: "making_charge_value" };
    if (making < 0) return { message: "Making charge cannot be negative.", field: "making_charge_value" };
    if (payload.making_charge_type === "percent" && making > 100) {
      return { message: "Making charge percentage cannot exceed 100%.", field: "making_charge_value" };
    }

    const wastage = parseNumber(payload.wastage_percent);
    if (wastage === null) return { message: "Wastage is required.", field: "wastage_percent" };
    if (Number.isNaN(wastage)) return { message: "Wastage must be a valid number.", field: "wastage_percent" };
    if (wastage < 0 || wastage > 50) return { message: "Wastage must be between 0% and 50%.", field: "wastage_percent" };

    const gst = parseNumber(payload.gst_percent);
    if (gst === null) return { message: "GST is required.", field: "gst_percent" };
    if (Number.isNaN(gst)) return { message: "GST must be a valid number.", field: "gst_percent" };
    if (gst < 0 || gst > 100) return { message: "GST must be between 0% and 100%.", field: "gst_percent" };

    return null;
  }

  function showResults(data) {
    hideError();

    const total = formatCurrency(data.total_price);

    if (priceBannerValue) priceBannerValue.textContent = total;
    showElement(priceBanner);

    if (fields.totalPrice) fields.totalPrice.textContent = total;
    if (fields.grossWeight) fields.grossWeight.textContent = data.gross_weight_grams + " g";
    if (fields.stoneWeight) fields.stoneWeight.textContent = data.stone_weight_grams + " g";
    if (fields.netWeight) fields.netWeight.textContent = data.net_weight_grams + " g";
    if (fields.purity) fields.purity.textContent = data.purity_label;
    if (fields.pureWeight) fields.pureWeight.textContent = data.pure_silver_weight + " g";
    if (fields.rate) fields.rate.textContent = formatCurrency(data.silver_rate_per_gram) + "/g";
    if (fields.silverValue) fields.silverValue.textContent = formatCurrency(data.silver_value);
    if (fields.making) fields.making.textContent = formatCurrency(data.making_charges);
    if (fields.wastage) fields.wastage.textContent = formatCurrency(data.wastage_amount);
    if (fields.subtotal) fields.subtotal.textContent = formatCurrency(data.subtotal);
    if (fields.gst) fields.gst.textContent = formatCurrency(data.gst_amount);

    showElement(resultSection);
    resultSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideResults() {
    hideElement(resultSection);
    hideElement(priceBanner);
    hideError();
  }

  function getPayload() {
    const formData = new FormData(form);
    return Object.fromEntries(formData.entries());
  }

  async function runCalculation() {
    hideError();

    const payload = getPayload();
    const clientError = validateClient(payload);

    if (clientError) {
      showError(clientError.message, clientError.field);
      return;
    }

    calculateBtn.disabled = true;
    calculateBtn.textContent = "Calculating…";

    try {
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        showError("Server returned an invalid response. Please try again.");
        return;
      }

      if (!response.ok || !data.success) {
        showError(data.error || "Something went wrong. Please try again.", data.field || null);
        return;
      }

      showResults(data.result);
    } catch {
      showError("Unable to reach the server. Check your connection and try again.");
    } finally {
      calculateBtn.disabled = false;
      calculateBtn.textContent = "Calculate Price";
    }
  }

  fieldNames.forEach(function (name) {
    const input = document.getElementById(name);
    if (!input) return;

    input.addEventListener("input", function () {
      const wrapper = document.querySelector('[data-field="' + name + '"]');
      const errEl = document.getElementById("err-" + name);

      if (wrapper) wrapper.classList.remove("field--error");
      if (errEl) errEl.textContent = "";
      input.removeAttribute("aria-invalid");
      if (!document.querySelector(".field--error") && errorEl) {
        hideElement(errorEl);
        errorEl.textContent = "";
      }
    });
  });

  if (makingType) {
    makingType.addEventListener("change", updateMakingLabel);
    updateMakingLabel();
  }

  calculateBtn.addEventListener("click", runCalculation);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    runCalculation();
  });

  form.addEventListener("reset", function () {
    hideResults();
    updateMakingLabel();
  });
})();
