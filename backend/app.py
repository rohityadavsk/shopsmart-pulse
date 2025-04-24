from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
import json
from kafka import KafkaProducer

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Kafka configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')

def create_producer():
    try:
        return KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            request_timeout_ms=5000,
            retries=3
        )
    except Exception as e:
        print(f"❌ Failed to create Kafka producer: {e}")
        raise

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

@app.route('/api/products', methods=['POST'])
def register_product():
    try:
        data = request.get_json()
        if not isinstance(data, dict):
            raise ValueError("Invalid JSON format. Expected a JSON object.")

        producer = create_producer()
        producer.send('product-topic', value=data)
        producer.flush()
        producer.close()

        return jsonify({
            "message": "Product sent to Kafka successfully",
            "data": data
        }), 200
    except Exception as e:
        print(f"❌ Exception: {e}")
        return jsonify({
            "error": "Failed to send product to Kafka",
            "details": str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
