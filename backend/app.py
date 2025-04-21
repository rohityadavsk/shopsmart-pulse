from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable, KafkaError
import ssl
import os
import time
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

def connect_kafka_producer(retries=5, delay=5):
    bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS")
    api_key = os.getenv("KAFKA_API_KEY")
    api_secret = os.getenv("KAFKA_API_SECRET")

    if not all([bootstrap_servers, api_key, api_secret]):
        raise Exception("Kafka environment variables are missing.")

    for attempt in range(retries):
        try:
            producer = KafkaProducer(
                bootstrap_servers=bootstrap_servers,
                security_protocol="SASL_SSL",
                sasl_mechanism="PLAIN",
                sasl_plain_username=api_key,
                sasl_plain_password=api_secret,
                ssl_context=ssl.create_default_context(),
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            print("✅ Kafka Producer connected successfully.")
            return producer
        except NoBrokersAvailable:
            print(f"❌ Kafka not available (attempt {attempt + 1}/{retries}). Retrying in {delay} seconds...")
            time.sleep(delay)
    raise Exception("❌ Kafka broker not available after multiple retries.")

# Kafka Producer instance
producer = connect_kafka_producer()

@app.route('/api/products', methods=['POST'])
def register_product():
    try:
        data = request.get_json()
        if not isinstance(data, dict):
            raise ValueError("Invalid JSON format. Expected a JSON object.")

        producer.send('product-topic', value=data)
        
        return jsonify({
            "message": "Product sent to Kafka",
            "data": data
        }), 200
    except KafkaError as ke:
        return jsonify({"error": f"Kafka error: {str(ke)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
