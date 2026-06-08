"""Silver ornament price calculation logic."""

from dataclasses import dataclass
from typing import Any


PURITY_OPTIONS = {
    "999": {"label": "999 (Fine Silver)", "factor": 0.999},
    "958": {"label": "958 (Britannia)", "factor": 0.958},
    "925": {"label": "925 (Sterling)", "factor": 0.925},
    "900": {"label": "900 (Coin Silver)", "factor": 0.900},
    "875": {"label": "875 (European)", "factor": 0.875},
    "800": {"label": "800 (Standard)", "factor": 0.800},
}

MAKING_CHARGE_TYPES = {
    "per_gram": "Per Gram (₹)",
    "fixed": "Fixed Amount (₹)",
    "percent": "Percentage (%)",
}


@dataclass
class CalculationInput:
    gross_weight_grams: float
    stone_weight_grams: float
    purity_code: str
    silver_rate_per_gram: float
    making_charge_type: str
    making_charge_value: float
    wastage_percent: float
    gst_percent: float


@dataclass
class CalculationResult:
    gross_weight_grams: float
    stone_weight_grams: float
    net_weight_grams: float
    purity_label: str
    purity_factor: float
    silver_rate_per_gram: float
    pure_silver_weight: float
    silver_value: float
    making_charges: float
    wastage_amount: float
    subtotal: float
    gst_amount: float
    total_price: float


def _parse_float(value: Any, field: str, label: str) -> tuple[float | None, str | None]:
    if value is None or (isinstance(value, str) and value.strip() == ""):
        return None, f"{label} is required."
    try:
        return float(value), None
    except (TypeError, ValueError):
        return None, f"{label} must be a valid number."


def validate_input(
    data: dict[str, Any] | None,
) -> tuple[CalculationInput | None, str | None, str | None]:
    if not data:
        return None, "No data received. Please fill in the form.", None

    gross_weight, err = _parse_float(
        data.get("gross_weight_grams"), "gross_weight_grams", "Gross weight"
    )
    if err:
        return None, err, "gross_weight_grams"

    stone_weight, err = _parse_float(
        data.get("stone_weight_grams"), "stone_weight_grams", "Stone weight"
    )
    if err:
        return None, err, "stone_weight_grams"

    rate, err = _parse_float(
        data.get("silver_rate_per_gram"), "silver_rate_per_gram", "Silver rate"
    )
    if err:
        return None, err, "silver_rate_per_gram"

    making_value, err = _parse_float(
        data.get("making_charge_value"), "making_charge_value", "Making charge"
    )
    if err:
        return None, err, "making_charge_value"

    wastage, err = _parse_float(
        data.get("wastage_percent"), "wastage_percent", "Wastage"
    )
    if err:
        return None, err, "wastage_percent"

    gst, err = _parse_float(data.get("gst_percent"), "gst_percent", "GST")
    if err:
        return None, err, "gst_percent"

    purity = str(data.get("purity", "925")).strip()
    making_type = str(data.get("making_charge_type", "per_gram")).strip()

    if gross_weight <= 0:
        return None, "Gross weight must be greater than 0 grams.", "gross_weight_grams"
    if gross_weight > 10000:
        return None, "Gross weight cannot exceed 10,000 grams.", "gross_weight_grams"
    if stone_weight < 0:
        return None, "Stone weight cannot be negative.", "stone_weight_grams"
    if stone_weight >= gross_weight:
        return None, "Stone weight must be less than gross weight.", "stone_weight_grams"
    if purity not in PURITY_OPTIONS:
        return None, "Please select a valid silver purity.", "purity"
    if rate <= 0:
        return None, "Silver rate must be greater than 0.", "silver_rate_per_gram"
    if rate > 100000:
        return None, "Silver rate seems unreasonably high.", "silver_rate_per_gram"
    if making_type not in MAKING_CHARGE_TYPES:
        return None, "Please select a valid making charge type.", "making_charge_type"
    if making_value < 0:
        return None, "Making charge cannot be negative.", "making_charge_value"
    if making_type == "percent" and making_value > 100:
        return None, "Making charge percentage cannot exceed 100%.", "making_charge_value"
    if wastage < 0 or wastage > 50:
        return None, "Wastage must be between 0% and 50%.", "wastage_percent"
    if gst < 0 or gst > 100:
        return None, "GST must be between 0% and 100%.", "gst_percent"

    return CalculationInput(
        gross_weight_grams=gross_weight,
        stone_weight_grams=stone_weight,
        purity_code=purity,
        silver_rate_per_gram=rate,
        making_charge_type=making_type,
        making_charge_value=making_value,
        wastage_percent=wastage,
        gst_percent=gst,
    ), None, None


def calculate_price(data: CalculationInput) -> CalculationResult:
    purity = PURITY_OPTIONS[data.purity_code]
    purity_factor = purity["factor"]

    net_weight = data.gross_weight_grams - data.stone_weight_grams
    pure_silver_weight = net_weight * purity_factor
    silver_value = pure_silver_weight * data.silver_rate_per_gram

    if data.making_charge_type == "per_gram":
        making_charges = net_weight * data.making_charge_value
    elif data.making_charge_type == "fixed":
        making_charges = data.making_charge_value
    else:
        making_charges = silver_value * (data.making_charge_value / 100)

    wastage_amount = silver_value * (data.wastage_percent / 100)
    subtotal = silver_value + making_charges + wastage_amount
    gst_amount = subtotal * (data.gst_percent / 100)
    total_price = subtotal + gst_amount

    return CalculationResult(
        gross_weight_grams=round(data.gross_weight_grams, 3),
        stone_weight_grams=round(data.stone_weight_grams, 3),
        net_weight_grams=round(net_weight, 3),
        purity_label=purity["label"],
        purity_factor=purity_factor,
        silver_rate_per_gram=round(data.silver_rate_per_gram, 2),
        pure_silver_weight=round(pure_silver_weight, 3),
        silver_value=round(silver_value, 2),
        making_charges=round(making_charges, 2),
        wastage_amount=round(wastage_amount, 2),
        subtotal=round(subtotal, 2),
        gst_amount=round(gst_amount, 2),
        total_price=round(total_price, 2),
    )


def result_to_dict(result: CalculationResult) -> dict[str, Any]:
    return {
        "gross_weight_grams": result.gross_weight_grams,
        "stone_weight_grams": result.stone_weight_grams,
        "net_weight_grams": result.net_weight_grams,
        "purity_label": result.purity_label,
        "purity_factor": result.purity_factor,
        "silver_rate_per_gram": result.silver_rate_per_gram,
        "pure_silver_weight": result.pure_silver_weight,
        "silver_value": result.silver_value,
        "making_charges": result.making_charges,
        "wastage_amount": result.wastage_amount,
        "subtotal": result.subtotal,
        "gst_amount": result.gst_amount,
        "total_price": result.total_price,
    }
