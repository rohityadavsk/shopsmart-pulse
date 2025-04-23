from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
import json

USE_KAFKA = os.getenv("USE_KAFKA", "false").lower() == "true"

if USE_KAFKA:
    from confluent_kafka import Producer
else:
    from kafka import KafkaProducer

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

# Kafka delivery report (for cloud Kafka only)
def delivery_report(err, msg):
    if err is not None:
        print(f"❌ Delivery failed: {err}")
    else:
        print(f"✅ Message delivered to {msg.topic()} [{msg.partition()}]")

def create_producer():
    if USE_KAFKA:
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
    else:
        return KafkaProducer(
            bootstrap_servers='localhost:9092',
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )

@app.route('/api/products', methods=['POST'])
def register_product():
    try:
        data = request.get_json()
        if not isinstance(data, dict):
            raise ValueError("Invalid JSON format. Expected a JSON object.")

        # Create the producer here to avoid startup failures
        producer = create_producer()

        if USE_KAFKA:
            payload = json.dumps(data)
            producer.produce('product-topic', key="product", value=payload, callback=delivery_report)
            producer.flush()
        else:
            producer.send('product-topic', value=data)
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
