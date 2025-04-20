from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable
import os
import time
import json

app = Flask(__name__)
CORS(app)

@app.route('/<path:filename>')
def serve_frontend(filename):
    return send_from_directory('../frontend', filename)


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
    for attempt in range(retries):
        try:
            producer = KafkaProducer(
                bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092"),
                value_serializer=lambda v: str(v).encode('utf-8')
            )
            print("✅ Kafka Producer connected successfully.")
            return producer
        except NoBrokersAvailable:
            print(f"❌ Kafka not available (attempt {attempt + 1}/{retries}). Retrying in {delay} seconds...")
            time.sleep(delay)
    raise Exception("❌ Kafka broker not available after multiple retries.")

# Kafka Producer instance
producer = connect_kafka_producer()

@app.route('/')
def home():
    return "🚀 Flask backend is up and running!", 200


@app.route('/api/products', methods=['POST'])
def register_product():
    try:
        data = request.get_json()
        # Ensure data is a dictionary
        if not isinstance(data, dict):
            raise ValueError("Invalid JSON format. Expected a JSON object.")
        
        # Serialize dict to JSON string before sending to Kafka
        producer.send('product-topic', value=json.dumps(data))
        
        return jsonify({
            "message": "Product sent to Kafka",
            "data": data
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
