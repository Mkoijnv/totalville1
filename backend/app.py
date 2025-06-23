# backend/app.py
import os
import datetime
import jwt
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_cors import CORS
import mysql.connector

load_dotenv()
app = Flask(__name__)
bcrypt = Bcrypt(app)
CORS(app) 

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_ALGORITHM'] = 'HS256'

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=os.getenv('DB_HOST'), user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'), database=os.getenv('DB_NAME')
        )
    except mysql.connector.Error as err:
        print(f"Erro ao conectar ao MySQL: {err}")
        return None

# --- ROTAS DE AUTENTICAÇÃO ---
@app.route("/api/register", methods=["POST"])
def register_user():
    data = request.get_json()
    if not all(k in data for k in ['name', 'email', 'password']): return jsonify({"error": "Dados incompletos"}), 400
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Erro de conexão"}), 500
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = %s", (data['email'],))
    if cursor.fetchone():
        cursor.close(); conn.close()
        return jsonify({"error": "Este email já está cadastrado"}), 409
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    try:
        cursor.execute("INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)", (data['name'], data['email'], hashed_password))
        conn.commit()
    except Exception as e: conn.rollback(); return jsonify({"error": str(e)}), 500
    finally: cursor.close(); conn.close()
    return jsonify({"message": "Usuário registrado com sucesso!"}), 201

@app.route("/api/login", methods=["POST"])
def login_user():
    data = request.get_json()
    if not all(k in data for k in ['email', 'password']): return jsonify({"error": "Dados incompletos"}), 400
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Erro de conexão"}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (data['email'],))
    user = cursor.fetchone()
    
    if user and bcrypt.check_password_hash(user['password_hash'], data['password']):
        token = jwt.encode(
            {'user_id': user['id'], 'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)}, 
            app.config['JWT_SECRET_KEY'], 
            algorithm=app.config['JWT_ALGORITHM']
        )
        cursor.close(); conn.close()
        
        # --- ALTERAÇÃO PRINCIPAL AQUI ---
        # Agora retornamos o token E os dados do usuário
        return jsonify({
            "access_token": token,
            "user": {
                "name": user['name']
            }
        }), 200
    else:
        cursor.close(); conn.close()
        return jsonify({"error": "Email ou senha inválidos"}), 401

# --- ROTAS DE CRIAÇÃO (POST) ---
@app.route("/api/visitors", methods=["POST"])
def add_visitor():
    token = request.headers.get('Authorization', '').split(" ")[1] if 'Authorization' in request.headers else None
    if not token: return jsonify({"error": "Token não fornecido"}), 401
    try:
        decoded_token = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
        user_id = decoded_token['user_id']
    except: return jsonify({"error": "Token inválido ou expirado"}), 401
    data = request.get_json()
    if not all(k in data for k in ['name', 'cpf', 'release_date', 'resident_apartment', 'has_car']): return jsonify({"error": "Dados incompletos"}), 400
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Erro de conexão"}), 500
    cursor = conn.cursor()
    sql = "INSERT INTO visitors (name, cpf, release_date, has_car, car_plate, car_model, car_color, resident_apartment, observations, registered_by_user_id) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
    try:
        cursor.execute(sql, (data['name'], data['cpf'], data['release_date'], data['has_car'], data.get('car_plate'), data.get('car_model'), data.get('car_color'), data['resident_apartment'], data.get('observations'), user_id))
        conn.commit()
    except mysql.connector.Error as err:
        conn.rollback()
        if err.errno == 1062: return jsonify({"error": "CPF já cadastrado."}), 409
        return jsonify({"error": str(err)}), 500
    finally: cursor.close(); conn.close()
    return jsonify({"message": "Visitante registrado com sucesso!"}), 201

@app.route("/api/occurrences", methods=["POST"])
def add_occurrence():
    token = request.headers.get('Authorization', '').split(" ")[1] if 'Authorization' in request.headers else None
    if not token: return jsonify({"error": "Token não fornecido"}), 401
    try:
        decoded_token = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
        user_id = decoded_token['user_id']
    except: return jsonify({"error": "Token inválido ou expirado"}), 401
    data = request.get_json()
    if not all(k in data for k in ['occurrence_type', 'description', 'occurrence_date']): return jsonify({"error": "Dados incompletos"}), 400
    occurrence_type = data.get('custom_type', data['occurrence_type']) if data['occurrence_type'] == 'Outro' else data['occurrence_type']
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Erro de conexão"}), 500
    cursor = conn.cursor()
    sql = "INSERT INTO occurrences (occurrence_type, description, location, occurrence_date, reported_by_user_id) VALUES (%s, %s, %s, %s, %s)"
    try:
        cursor.execute(sql, (occurrence_type, data['description'], data.get('location'), data['occurrence_date'], user_id))
        conn.commit()
    except Exception as e: conn.rollback(); return jsonify({"error": str(e)}), 500
    finally: cursor.close(); conn.close()
    return jsonify({"message": "Ocorrência registrada com sucesso!"}), 201

@app.route("/api/reservations", methods=["POST"])
def add_reservation():
    token = request.headers.get('Authorization', '').split(" ")[1] if 'Authorization' in request.headers else None
    if not token: return jsonify({"error": "Token não fornecido"}), 401
    try:
        decoded_token = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
        user_id = decoded_token['user_id']
    except: return jsonify({"error": "Token inválido ou expirado"}), 401
    data = request.get_json()
    if not all(k in data for k in ['space_name', 'reservation_date']): return jsonify({"error": "Dados incompletos"}), 400
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Erro de conexão"}), 500
    cursor = conn.cursor()
    sql = "INSERT INTO reservations (space_name, reservation_date, reserved_by_user_id) VALUES (%s, %s, %s)"
    try:
        cursor.execute(sql, (data['space_name'], data['reservation_date'], user_id))
        conn.commit()
    except mysql.connector.Error as err:
        conn.rollback()
        if err.errno == 1062: return jsonify({"error": "Este espaço já está reservado para a data selecionada."}), 409
        return jsonify({"error": str(err)}), 500
    finally: cursor.close(); conn.close()
    return jsonify({"message": "Reserva solicitada com sucesso!"}), 201

# --- ROTAS DE LEITURA (GET) PARA O DASHBOARD ---
@app.route("/api/my-reservations", methods=["GET"])
def get_my_reservations():
    token = request.headers.get('Authorization', '').split(" ")[1] if 'Authorization' in request.headers else None
    if not token: return jsonify({"error": "Token não fornecido"}), 401
    try:
        decoded_token = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
        user_id = decoded_token['user_id']
    except: return jsonify({"error": "Token inválido ou expirado"}), 401
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Erro de conexão"}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT space_name, reservation_date, status FROM reservations WHERE reserved_by_user_id = %s ORDER BY reservation_date DESC", (user_id,))
    reservations = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(reservations)

@app.route("/api/my-visitors", methods=["GET"])
def get_my_visitors():
    token = request.headers.get('Authorization', '').split(" ")[1] if 'Authorization' in request.headers else None
    if not token: return jsonify({"error": "Token não fornecido"}), 401
    try:
        decoded_token = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
        user_id = decoded_token['user_id']
    except: return jsonify({"error": "Token inválido ou expirado"}), 401
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Erro de conexão"}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT name, cpf, release_date FROM visitors WHERE registered_by_user_id = %s ORDER BY release_date DESC", (user_id,))
    visitors = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(visitors)

# --- ROTA GET PARA O RESUMO DE OCORRÊNCIAS ---
@app.route("/api/occurrences/summary", methods=["GET"])
def get_occurrences_summary():
    # Proteção da rota
    token = request.headers.get('Authorization', '').split(" ")[1] if 'Authorization' in request.headers else None
    if not token: return jsonify({"error": "Token não fornecido"}), 401
    try:
        jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
    except:
        return jsonify({"error": "Token inválido ou expirado"}), 401
        
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Erro de conexão"}), 500
    cursor = conn.cursor(dictionary=True)

    # Query SQL que conta (COUNT) as ocorrências e as agrupa (GROUP BY) por tipo,
    # filtrando apenas as com status 'Aberto'.
    sql = """
        SELECT occurrence_type, COUNT(*) as count 
        FROM occurrences 
        WHERE status = 'Aberto' 
        GROUP BY occurrence_type
        ORDER BY count DESC
    """
    cursor.execute(sql)
    summary = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return jsonify(summary)



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)