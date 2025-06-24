# backend/app.py
import os
import datetime
import jwt
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_cors import CORS
import mysql.connector
import mercadopago
import json

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
    
    # Configura o SDK do Mercado Pago com sua credencial
sdk = mercadopago.SDK(os.getenv("MERCADOPAGO_ACCESS_TOKEN"))

# ... (suas outras rotas)

# --- ROTA PARA GERAR O PAGAMENTO PIX DE UMA RESERVA ---
@app.route("/api/reservations/<int:reservation_id>/create-payment", methods=["POST"])
def create_reservation_payment(reservation_id):
    # (Adicione a lógica de proteção com token JWT aqui para garantir que o usuário está logado)

    # Aqui você buscaria os detalhes da reserva no seu banco, como o valor a ser pago
    # Para o nosso teste, vamos usar um valor fixo de R$ 50.00
    payment_amount = 50.00 

    payment_data = {
        "transaction_amount": payment_amount,
        "description": f"Pagamento da reserva de espaço #{reservation_id}",
        "payment_method_id": "pix",
        "payer": {
            "email": "test_user_123456@testuser.com", # Em um caso real, você pegaria o email do usuário logado
        },
        "notification_url": "https://ec95-2804-1128-bd48-a100-6c8e-cbc6-5dc6-f044.ngrok-free.app/api/webhooks/mercadopago",
        "external_reference": str(reservation_id) # MUITO IMPORTANTE: Link entre o pagamento e sua reserva
    }

    try:
        payment_response = sdk.payment().create(payment_data)
        payment = payment_response["response"]
        
        pix_data = {
            "payment_id": payment["id"],
            "qr_code_image": payment["point_of_interaction"]["transaction_data"]["qr_code_base64"],
            "qr_code_text": payment["point_of_interaction"]["transaction_data"]["qr_code"]
        }
        return jsonify(pix_data), 200

    except Exception as e:
        return jsonify({"error": f"Erro ao criar pagamento PIX: {e}"}), 500


# --- ROTA PARA RECEBER NOTIFICAÇÕES (WEBHOOK) DO MERCADO PAGO ---
@app.route("/api/webhooks/mercadopago", methods=["POST"])
def mercadopago_webhook():
    data = request.json
    print(f"\n--- Webhook do Mercado Pago Recebido ---")
    print(f"Corpo da Notificação: {data}")

    if data and data.get("type") == "payment":
        payment_id = data["data"]["id"]
        print(f"Notificação é do tipo 'payment'. ID do Pagamento: {payment_id}")

        try:
            # Com o ID do pagamento, busca o status real no Mercado Pago
            print(f"Buscando detalhes do pagamento {payment_id} no Mercado Pago...")
            payment_info_response = sdk.payment().get(payment_id)
            payment_info = payment_info_response["response"]
            
            print(f"Resposta do GET do pagamento: {payment_info}")
            payment_status = payment_info.get("status")
            print(f"Status do pagamento encontrado: '{payment_status}'")

            if payment_status == "approved":
                reservation_id = payment_info.get("external_reference")
                print(f"PAGAMENTO APROVADO! Atualizando reserva #{reservation_id}...")

                conn = get_db_connection()
                if conn:
                    cursor = conn.cursor()
                    cursor.execute("UPDATE reservations SET status = 'Aprovada' WHERE id = %s", (reservation_id,))
                    conn.commit()
                    cursor.close()
                    conn.close()
                    print(f"Reserva #{reservation_id} atualizada para 'Aprovada' no banco de dados.")
            else:
                print(f"Pagamento não está com status 'approved'. Nada a fazer.")

        except Exception as e:
            print(f"ERRO AO PROCESSAR WEBHOOK: {e}")

    return jsonify({"status": "ok"}), 200
# --- ROTAS DE AUTENTICAÇÃO ---
@app.route("/api/register", methods=["POST"])
def register_user():
    data = request.get_json()
    # Adicionamos 'apt' aos campos obrigatórios
    if not all(k in data for k in ['name', 'email', 'password', 'apt']): 
        return jsonify({"error": "Dados incompletos"}), 400
        
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Erro de conexão"}), 500
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = %s", (data['email'],))
    if cursor.fetchone():
        cursor.close(); conn.close()
        return jsonify({"error": "Este email já está cadastrado"}), 409
    
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    # Adicionamos 'apt' ao comando INSERT
    sql = "INSERT INTO users (name, email, password_hash, apt) VALUES (%s, %s, %s, %s)"
    try:
        cursor.execute(sql, (data['name'], data['email'], hashed_password, data['apt']))
        conn.commit()
    except Exception as e: 
        conn.rollback(); return jsonify({"error": str(e)}), 500
    finally: 
        cursor.close(); conn.close()
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
    
    # Validação do usuário e senha
    if user and bcrypt.check_password_hash(user['password_hash'], data['password']):
        
        # --- NOVA VALIDAÇÃO ---
        # Verifica se o usuário está ativo
        if not user['active']:
            cursor.close(); conn.close()
            return jsonify({"error": "Este usuário está inativo. Contate a administração."}), 403 # 403 Forbidden

        # --- NOVO PAYLOAD DO TOKEN ---
        # Incluímos a permissão (role) e o apt no token
        token_payload = {
            'user_id': user['id'],
            'role': user['permission'],
            'apt': user['apt'],
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
        }
        token = jwt.encode(token_payload, app.config['JWT_SECRET_KEY'], algorithm=app.config['JWT_ALGORITHM'])
        
        cursor.close(); conn.close()
        
        # --- NOVA RESPOSTA ---
        # Retornamos o token E os dados do usuário para o frontend usar
        return jsonify({
            "access_token": token,
            "user": {
                "name": user['name'],
                "email": user['email'],
                "apt": user['apt'],
                "role": user['permission']
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

# Em backend/app.py

# Em backend/app.py

@app.route("/api/reservations", methods=["POST"])
def add_reservation():
    # 1. Proteção da Rota e Validação dos Dados
    token = request.headers.get('Authorization', '').split(" ")[1] if 'Authorization' in request.headers else None
    if not token: return jsonify({"error": "Token não fornecido"}), 401
    try:
        decoded_token = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
        user_id = decoded_token['user_id']
    except:
        return jsonify({"error": "Token inválido ou expirado"}), 401
        
    data = request.get_json()
    if not all(k in data for k in ['space_name', 'reservation_date']):
        return jsonify({"error": "Dados incompletos"}), 400

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Erro de conexão com o banco"}), 500
    cursor = conn.cursor(dictionary=True)

    # --- LÓGICA DE VERIFICAÇÃO INTELIGENTE ---
    try:
        # CORREÇÃO APLICADA AQUI: A consulta agora busca apenas o 'status', que é o que precisamos.
        check_sql = "SELECT status FROM reservations WHERE space_name = %s AND reservation_date = %s"
        cursor.execute(check_sql, (data['space_name'], data['reservation_date']))
        existing_reservation = cursor.fetchone()

        if existing_reservation:
            if existing_reservation['status'] == 'Aprovada':
                return jsonify({"error": "Este espaço já está reservado e confirmado para a data selecionada."}), 409
            else: # Se o status for 'Pendente' ou qualquer outro
                return jsonify({"error": "Uma reserva para esta data já foi solicitada e aguarda pagamento. Por favor, consulte a administração ou tente mais tarde."}), 409
    except mysql.connector.Error as err:
         return jsonify({"error": f"Erro ao verificar disponibilidade: {err}"}), 500

    # Busca de E-mail do Usuário
    try:
        cursor.execute("SELECT email FROM users WHERE id = %s", (user_id,))
        user_record = cursor.fetchone()
        if not user_record:
            raise Exception("Usuário do token não encontrado no banco de dados.")
        user_email = user_record['email']
    except Exception as e:
        cursor.close(); conn.close()
        return jsonify({"error": f"Erro ao buscar dados do usuário: {e}"}), 500
    
    # Criação da Reserva
    sql_insert = "INSERT INTO reservations (space_name, reservation_date, reserved_by_user_id, status) VALUES (%s, %s, %s, 'Pendente')"
    reservation_id = None
    try:
        cursor.execute(sql_insert, (data['space_name'], data['reservation_date'], user_id))
        reservation_id = cursor.lastrowid
        conn.commit()
        print(f"Reserva #{reservation_id} criada como 'Pendente'.")
    except mysql.connector.Error as err:
        conn.rollback()
        return jsonify({"error": "Conflito de agendamento detectado pelo banco de dados."}), 409

    # Geração do Pagamento PIX
    if reservation_id:
        try:
            payment_amount = 0.10
            payment_data = {
                "transaction_amount": payment_amount,
                "description": f"Taxa de reserva para {data['space_name']} em {data['reservation_date']}",
                "payment_method_id": "pix",
                "payer": { "email": user_email },
                "notification_url": f"https://ec95-2804-1128-bd48-a100-6c8e-cbc6-5dc6-f044.ngrok-free.app/api/webhooks/mercadopago", # Lembre-se que esta URL é temporária
                "external_reference": str(reservation_id)
            }
            payment_response = sdk.payment().create(payment_data)

            if payment_response["status"] == 201:
                payment = payment_response["response"]
                print(f"PIX Criado para reserva #{reservation_id}. Payment ID: {payment['id']}")
                pix_data = {
                    "payment_id": payment["id"],
                    "qr_code_image": payment["point_of_interaction"]["transaction_data"]["qr_code_base64"],
                    "qr_code_text": payment["point_of_interaction"]["transaction_data"]["qr_code"]
                }
                return jsonify(pix_data), 201
            else:
                raise Exception(payment_response["response"].get("message", "Erro desconhecido do Mercado Pago"))
        except Exception as e:
            print(f"Erro ao criar pagamento PIX: {e}")
            return jsonify({"error": "A reserva foi criada, mas houve uma falha ao gerar o pagamento PIX."}), 500
        finally:
            cursor.close()
            conn.close()
    
    # Fallback
    cursor.close()
    conn.close()
    return jsonify({"error": "Ocorreu um erro inesperado ao processar a reserva."}), 500
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

@app.route("/api/reservations/booked-dates", methods=["GET"])
def get_booked_dates():
    # Protegemos a rota da mesma forma
    token = request.headers.get('Authorization', '').split(" ")[1] if 'Authorization' in request.headers else None
    if not token: return jsonify({"error": "Token não fornecido"}), 401
    try:
        jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
    except:
        return jsonify({"error": "Token inválido ou expirado"}), 401
    
    # Pegamos o nome do espaço dos parâmetros da URL (ex: ?space=Salão%20de%20Festas)
    space_name = request.args.get('space')
    if not space_name:
        return jsonify({"error": "Nome do espaço não fornecido"}), 400

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Erro de conexão"}), 500
    cursor = conn.cursor()

    # Buscamos as datas onde o status é 'Aprovada' (ou o que você definir como "reservado")
    # Retornamos apenas a data da reserva
    sql = "SELECT reservation_date FROM reservations WHERE space_name = %s AND status = 'Aprovada'"
    cursor.execute(sql, (space_name,))
    
    # Convertemos o resultado para uma lista de strings no formato 'YYYY-MM-DD'
    booked_dates = [item[0].strftime('%Y-%m-%d') for item in cursor.fetchall()]
    
    cursor.close()
    conn.close()
    
    return jsonify(booked_dates)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)