from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from confluent_kafka import Producer
import os
import json

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

@app.route('/')
def home():
    return "🚀 Flask backend is up and running!", 200

@app.route('/product')
def serve_product_form():
    return render_template('product.html')

@app.route('/health')
def health():
    return "OK", 200

@app.route("/api/products-list", methods=["GET"])
def get_products():
    products_file = os.path.join(app.root_path, "products.json")
    try:
        with open(products_file, "r") as f:
            products = json.load(f)
        return jsonify(products)
    except Exception as e:
        return jsonify({
            "error": "Failed to load products",
            "details": str(e)
        }), 500

# Kafka Producer
def create_producer():
    bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS")
    api_key = os.getenv("KAFKA_API_KEY")
    api_secret = os.getenv("KAFKA_API_SECRET")

    if not all([bootstrap_servers, api_key, api_secret]):
        raise Exception("Kafka environment variables are missing.")

    conf = {
        'bootstrap.servers': bootstrap_servers,
        'security.protocol': 'SASL_SSL',
        'sasl.mechanisms': 'PLAIN',
        'sasl.username': api_key,
        'sasl.password': api_secret
    }

    return Producer(conf)

producer = create_producer()

# Kafka delivery report (callback)
def delivery_report(err, msg):
    if err is not None:
        print(f"❌ Delivery failed: {err}")
    else:
        print(f"✅ Message delivered to {msg.topic()} [{msg.partition()}]")

@app.route('/api/products', methods=['POST'])
def register_product():
    try:
        data = request.get_json()
        if not isinstance(data, dict):
            raise ValueError("Invalid JSON format. Expected a JSON object.")

        payload = json.dumps(data)
        producer.produce('product-topic', key="product", value=payload, callback=delivery_report)
        producer.flush()

        return jsonify({
            "message": "Product sent to Kafka",
            "data": data
        }), 200
    except Exception as e:
        print(f"❌ Exception: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
