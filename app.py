import os
import traceback

from flask import Flask, jsonify, render_template, request

from calculator import (
    MAKING_CHARGE_TYPES,
    PURITY_OPTIONS,
    calculate_price,
    result_to_dict,
    validate_input,
)

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-key-change-in-production")


def _is_api_request() -> bool:
    return request.path.startswith("/api/") or (
        request.accept_mimetypes.best == "application/json"
    )


def _error_response(message: str, status: int = 400, field: str | None = None):
    payload = {"success": False, "error": message}
    if field:
        payload["field"] = field
    return jsonify(payload), status


@app.errorhandler(404)
def not_found(error):
    if _is_api_request():
        return _error_response("The requested resource was not found.", 404)
    return "Page not found.", 404


@app.errorhandler(405)
def method_not_allowed(error):
    if _is_api_request():
        return _error_response("Method not allowed.", 405)
    return _error_response("Method not allowed.", 405)


@app.errorhandler(500)
def internal_error(error):
    app.logger.error("Internal server error: %s", error)
    if _is_api_request():
        return _error_response("An unexpected server error occurred. Please try again.", 500)
    return _error_response("An unexpected server error occurred. Please try again.", 500)


@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/")
def index():
    return render_template(
        "index.html",
        purity_options=PURITY_OPTIONS,
        making_charge_types=MAKING_CHARGE_TYPES,
        default_gst=float(os.environ.get("DEFAULT_GST_PERCENT", 3)),
    )


@app.route("/api/calculate", methods=["POST"])
def api_calculate():
    try:
        payload = request.get_json(silent=True) or request.form.to_dict()
        calc_input, error, field = validate_input(payload)

        if error:
            return _error_response(error, 400, field)

        result = calculate_price(calc_input)
        return jsonify({"success": True, "result": result_to_dict(result)})

    except Exception:
        app.logger.error("Calculation failed:\n%s", traceback.format_exc())
        return _error_response("An unexpected error occurred during calculation.", 500)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
