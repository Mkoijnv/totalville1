import os
import datetime
import jwt
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_cors import CORS
import mysql.connector
import mercadopago

load_dotenv()
app = Flask(__name__)
bcrypt = Bcrypt(app)
CORS(app)

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_ALGORITHM'] = 'HS256'
TOKEN_EXPIRATION_HOURS = 1

UNREGISTERED_MORADOR_PLACEHOLDER_ID = 1

def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DB_NAME'),
            charset='utf8mb4'
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Erro ao conectar ao MySQL: {err}")
        return None

sdk = mercadopago.SDK(os.getenv("MERCADOPAGO_ACCESS_TOKEN"))

def token_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"error": "Token de autenticação não fornecido."}), 401

        try:
            decoded_token = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
            request.user_identity = decoded_token
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expirado. Faça login novamente."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token inválido ou corrompido."}), 401
        except Exception as e:
            print(f"Erro inesperado na validação do token: {e}")
            return jsonify({"error": f"Erro na validação do token: {str(e)}"}), 500

        return f(*args, **kwargs)
    return decorated

# Função auxiliar para verificar permissões - MELHORADA
def check_permission(allowed_roles):
    current_user_identity = request.user_identity
    user_role = current_user_identity.get('role')
    return user_role in allowed_roles


# --- ROTA PARA GERAR O PAGAMENTO PIX DE UMA RESERVA ---
@app.route("/api/reservas/<int:reserva_id>/create-payment", methods=["POST"])
def create_reservation_payment(reserva_id):
    payment_amount = 0.10
    payment_data = {
        "transaction_amount": payment_amount,
        "description": f"Taxa de reserva para espaço #{reserva_id}",
        "payment_method_id": "pix",
        "payer": {
            "email": "test_user_123456@testuser.com",
        },
        "notification_url": f"https://67ff-2804-1128-bd48-a100-84f0-612c-d46b-f966.ngrok-free.app/api/webhooks/mercadopago",
        "external_reference": str(reserva_id)
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
        print(f"Erro ao criar pagamento PIX para reserva {reserva_id}: {e}")
        return jsonify({"error": f"Erro ao criar pagamento PIX: {e}"}), 500

@app.route("/api/auth/me", methods=["GET"])
@token_required
def get_logged_in_user_data():
    try:
        current_user_identity = request.user_identity

        user_id = current_user_identity.get('user_id')
        user_apt = current_user_identity.get('apt')
        user_role = current_user_identity.get('role')

        if not all([user_id, user_role]):
            return jsonify({"error": "Dados de identidade do token incompletos."}), 400

        return jsonify({
            "user_id": user_id,
            "apartment": user_apt,
            "role": user_role
        }), 200
    except Exception as e:
        print(f"Erro ao obter dados do usuário logado na rota /api/auth/me: {e}")
        return jsonify({"error": f"Erro ao obter dados do usuário: {str(e)}"}), 500

# --- ROTA PARA RECEBER NOTIFICAÇÕES (WEBHOOK) DO MERCADO PAGO ---
@app.route("/api/webhooks/mercadopago", methods=["POST"])
def mercadopago_webhook():
    data = request.json
    print(f"\n--- Webhook do Mercado Pago Recebido ---")
    print(f"Corpo da Notificação: {data}")

    if data and data.get("type") == "payment":
        payment_id = data["data"]["id"]
        print(f"Notificação é do tipo 'payment'. ID do Pagamento: {payment_id}")

        conn = None
        cursor = None
        try:
            print(f"Buscando detalhes do pagamento {payment_id} no Mercado Pago...")
            payment_info_response = sdk.payment().get(payment_id)
            payment_info = payment_info_response["response"]

            print(f"Resposta do GET do pagamento: {payment_info}")
            payment_status = payment_info.get("status")
            print(f"Status do pagamento encontrado: '{payment_status}'")

            if payment_status == "approved":
                reserva_id = payment_info.get("external_reference")
                print(f"PAGAMENTO APROVADO! Atualizando reserva #{reserva_id}...")

                conn = get_db_connection()
                if conn:
                    cursor = conn.cursor()
                    cursor.execute("UPDATE reservas SET status = 'Aprovada' WHERE id = %s", (reserva_id,))
                    conn.commit()
                    print(f"Reserva #{reserva_id} atualizada para 'Aprovada' no banco de dados.")
            else:
                print(f"Pagamento não está com status 'approved'. Nada a fazer.")

        except Exception as e:
            print(f"ERRO AO PROCESSAR WEBHOOK: {e}")
            if conn and conn.is_connected():
                conn.rollback()
        finally:
            if cursor:
                cursor.close()
            if conn and conn.is_connected():
                conn.close()

    return jsonify({"status": "ok"}), 200

# --- ROTAS DE AUTENTICAÇÃO ---
@app.route("/api/register", methods=["POST"])
def register_admin():
    data = request.get_json()
    if not all(k in data for k in ['name', 'email', 'password']):
        return jsonify({"error": "Dados incompletos: nome, email e senha são obrigatórios."}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Erro de conexão com o banco de dados."}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM administradores WHERE email = %s", (data['email'],))
        if cursor.fetchone():
            return jsonify({"error": "Este e-mail já está cadastrado como administrador."}), 409
        hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        sql = """
            INSERT INTO administradores
                (nome, email, senha_hash, permissao, ativo)
            VALUES
                (%s, %s, %s, %s, TRUE)
        """
        cursor.execute(sql, (data['name'], data['email'], hashed_password, 'ADM'))
        conn.commit()
        return jsonify({"message": "Administrador registrado com sucesso!"}), 201
    except mysql.connector.Error as err:
        conn.rollback()
        return jsonify({"error": f"Erro ao registrar administrador: {err}"}), 500
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/login", methods=["POST"])
def login_user():
    data = request.get_json()
    if not all(k in data for k in ['email', 'password']):
        return jsonify({"error": "Dados incompletos: email e senha são obrigatórios."}), 400

    conn = get_db_connection()
    if not conn:
        print("LOGIN ERROR: Failed to get DB connection.")
        return jsonify({"error": "Erro de conexão com o banco de dados."}), 500

    cursor = conn.cursor(dictionary=True)

    usuario = None
    user_role = None
    user_apt = None

    try:
        print(f"LOGIN: Attempting to authenticate email: {data['email']} as ADMIN.")
        cursor.execute("""
            SELECT id, nome, email, senha_hash, 'ADMIN' as role
            FROM administradores
            WHERE email = %s AND ativo = TRUE
        """, (data['email'],))
        usuario = cursor.fetchone()
        if usuario:
            user_role = 'ADMIN'
            user_name = usuario['nome']
            user_email = usuario['email']
            user_id = usuario['id']
            user_apt = 'ADMIN'
            print(f"LOGIN: User {user_email} found as ADMIN.")

        if not usuario:
            print(f"LOGIN: User not ADMIN, attempting as MORADOR: {data['email']}.")
            cursor.execute("""
                SELECT m.id, m.nome_completo as nome, m.email, m.senha_hash,
                       u.numero as apartamento, 'MORADOR' as role
                FROM moradores m
                JOIN unidades u ON m.unidade_id = u.id
                WHERE m.email = %s AND m.ativo = TRUE
            """, (data['email'],))
            usuario = cursor.fetchone()
            if usuario:
                user_role = 'MORADOR'
                user_name = usuario['nome']
                user_email = usuario['email']
                user_id = usuario['id']
                user_apt = usuario['apartamento']
                print(f"LOGIN: User {user_email} found as MORADOR in apartment {user_apt}.")

        if not usuario:
            print(f"LOGIN ERROR: No active user found for email: {data['email']}.")
            return jsonify({"error": "Email ou senha inválidos."}), 401

        print(f"LOGIN: Checking password for user {user_email}.")
        if bcrypt.check_password_hash(usuario['senha_hash'], data['password']):
            print(f"LOGIN: Password correct for user {user_email}. Generating token.")
            access_token_payload = {
                'user_id': user_id,
                'role': user_role,
                'apt': user_apt,
                'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=TOKEN_EXPIRATION_HOURS)
            }
            access_token = jwt.encode(access_token_payload, app.config['JWT_SECRET_KEY'], algorithm=app.config['JWT_ALGORITHM'])

            response_data = {
                "access_token": access_token,
                "user": {
                    "name": user_name,
                    "email": user_email,
                    "role": user_role
                }
            }
            if user_role == 'MORADOR':
                response_data['user']['apartment'] = user_apt

            print(f"LOGIN SUCCESS: User {user_email} logged in. Role: {user_role}.")
            return jsonify(response_data), 200
        else:
            print(f"LOGIN ERROR: Incorrect password for user {user_email}.")
            return jsonify({"error": "Email ou senha inválidos."}), 401
    except Exception as e:
        print(f"LOGIN CRITICAL ERROR: {e}")
        return jsonify({"error": "Erro interno do servidor durante o login."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# --- ROTAS PARA UNIDADES ---
@app.route("/api/unidades", methods=["GET"])
@token_required
def get_unidades():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Erro de conexão com o banco de dados."}), 500

        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, tipo_unidade, bloco, numero, andar
            FROM unidades
            ORDER BY tipo_unidade DESC, bloco ASC, CAST(numero AS UNSIGNED) ASC
        """)
        unidades = cursor.fetchall()
        return jsonify(unidades), 200
    except mysql.connector.Error as err:
        print(f"Erro no banco de dados ao buscar unidades: {err}")
        return jsonify({"error": f"Erro ao buscar unidades: {err}"}), 500
    except Exception as e:
        print(f"Erro interno do servidor ao buscar unidades: {e}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/unidades/<int:unidade_id>", methods=["GET"])
@token_required
def get_unidade_by_id(unidade_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Erro de conexão com o banco de dados."}), 500

        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, tipo_unidade, bloco, numero, andar
            FROM unidades
            WHERE id = %s
        """, (unidade_id,))
        unidade = cursor.fetchone()

        if not unidade:
            return jsonify({"error": "Unidade não encontrada."}), 404

        return jsonify(unidade), 200
    except mysql.connector.Error as err:
        print(f"Erro no banco de dados ao buscar unidade por ID: {err}")
        return jsonify({"error": f"Erro ao buscar unidade: {err}"}), 500
    except Exception as e:
        print(f"Erro interno do servidor ao buscar unidade por ID: {e}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

# --- ROTAS CRUD PARA MORADORES ---
@app.route("/api/moradores", methods=["POST"])
@token_required
def add_morador():
    if not check_permission(['ADMIN']): # Somente ADMIN pode adicionar morador
        return jsonify({"error": "Acesso negado. Apenas administradores podem adicionar moradores."}), 403

    try:
        data = request.get_json()

        required_fields = ['nome_completo', 'email', 'password', 'unidade_id']
        if not all(k in data for k in required_fields):
            missing = [k for k in required_fields if k not in data]
            return jsonify({"error": f"Dados incompletos. Campos obrigatórios: {', '.join(missing)}"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Erro de conexão com o banco de dados."}), 500

        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM moradores WHERE email = %s", (data['email'],))
        if cursor.fetchone():
            return jsonify({"error": "Este e-mail já está cadastrado como morador."}), 409

        if data.get('cpf'):
            cursor.execute("SELECT id FROM moradores WHERE cpf = %s", (data['cpf'],))
            if cursor.fetchone():
                return jsonify({"error": "Este CPF já está cadastrado como morador."}), 409

        cursor.execute("SELECT id FROM unidades WHERE id = %s", (data['unidade_id'],))
        if not cursor.fetchone():
            return jsonify({"error": "ID da unidade não encontrado ou inválido."}), 400

        hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')

        sql = """
            INSERT INTO moradores
                (nome_completo, email, senha_hash, unidade_id, cpf, rg, profissao, whatsapp, tipo_morador, ativo)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
        """
        cursor.execute(sql, (
            data['nome_completo'],
            data['email'],
            hashed_password,
            data['unidade_id'],
            data.get('cpf'),
            data.get('rg'),
            data.get('profissao'),
            data.get('whatsapp'),
            data.get('tipo_morador', 'outro')
        ))
        conn.commit()

        return jsonify({"message": "Morador cadastrado com sucesso!"}), 201

    except mysql.connector.Error as err:
        conn.rollback()
        print(f"Erro no banco de dados ao adicionar morador: {err}")
        return jsonify({"error": f"Erro no banco de dados: {str(err)}"}), 500
    except Exception as e:
        conn.rollback()
        print(f"Erro interno ao adicionar morador: {e}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/moradores", methods=["GET"])
@token_required
def get_moradores():
    if not check_permission(['ADMIN']): # Somente ADMIN pode listar moradores
        return jsonify({"error": "Acesso negado. Apenas administradores podem listar moradores."}), 403
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Erro de conexão com o banco de dados."}), 500

        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, nome_completo, email, unidade_id, cpf, rg, profissao, whatsapp, tipo_morador, ativo
            FROM moradores
            ORDER BY nome_completo ASC
        """)
        moradores = cursor.fetchall()
        return jsonify(moradores), 200
    except mysql.connector.Error as err:
        print(f"Erro no banco de dados ao buscar moradores: {err}")
        return jsonify({"error": f"Erro ao buscar moradores: {err}"}), 500
    except Exception as e:
        print(f"Erro interno do servidor ao buscar moradores: {e}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/moradores/<int:morador_id>", methods=["GET"])
@token_required
def get_morador_by_id(morador_id):
    if not check_permission(['ADMIN']): # Somente ADMIN pode ver morador por ID
        return jsonify({"error": "Acesso negado. Apenas administradores podem visualizar detalhes de moradores."}), 403
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Erro de conexão com o banco de dados."}), 500

        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, nome_completo, email, unidade_id, cpf, rg, profissao, whatsapp, tipo_morador, ativo
            FROM moradores
            WHERE id = %s
        """, (morador_id,))
        morador = cursor.fetchone()

        if not morador:
            return jsonify({"error": "Morador não encontrado."}), 404

        return jsonify(morador), 200
    except mysql.connector.Error as err:
        print(f"Erro no banco de dados ao buscar morador por ID: {err}")
        return jsonify({"error": f"Erro ao buscar morador: {err}"}), 500
    except Exception as e:
        print(f"Erro interno do servidor ao buscar morador por ID: {e}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/moradores/<int:morador_id>", methods=["PUT"])
@token_required
def update_morador(morador_id):
    if not check_permission(['ADMIN']): # Somente ADMIN pode atualizar morador
        return jsonify({"error": "Acesso negado. Apenas administradores podem atualizar moradores."}), 403
    data = request.get_json()
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id FROM moradores WHERE id = %s", (morador_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Morador não encontrado."}), 404

        set_clauses = []
        values = []

        if 'nome_completo' in data:
            set_clauses.append("nome_completo = %s")
            values.append(data['nome_completo'])
        if 'email' in data:
            cursor.execute("SELECT id FROM moradores WHERE email = %s AND id != %s", (data['email'], morador_id))
            if cursor.fetchone():
                return jsonify({"error": "Este e-mail já está cadastrado para outro morador."}), 409
            set_clauses.append("email = %s")
            values.append(data['email'])
        if 'password' in data and data['password']:
            hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
            set_clauses.append("senha_hash = %s")
            values.append(hashed_password)
        if 'unidade_id' in data:
            cursor.execute("SELECT id FROM unidades WHERE id = %s", (data['unidade_id'],))
            if not cursor.fetchone():
                return jsonify({"error": "ID da unidade não encontrado ou inválido."}), 400
            set_clauses.append("unidade_id = %s")
            values.append(data['unidade_id'])
        if 'cpf' in data:
            if data['cpf']:
                cursor.execute("SELECT id FROM moradores WHERE cpf = %s AND id != %s", (data['cpf'], morador_id))
                if cursor.fetchone():
                    return jsonify({"error": "Este CPF já está cadastrado para outro morador."}), 409
            set_clauses.append("cpf = %s")
            values.append(data['cpf'])
        if 'rg' in data:
            set_clauses.append("rg = %s")
            values.append(data['rg'])
        if 'profissao' in data:
            set_clauses.append("profissao = %s")
            values.append(data['profissao'])
        if 'whatsapp' in data:
            set_clauses.append("whatsapp = %s")
            values.append(data['whatsapp'])
        if 'tipo_morador' in data:
            set_clauses.append("tipo_morador = %s")
            values.append(data['tipo_morador'])

        if not set_clauses:
            return jsonify({"message": "Nenhum dado para atualizar."}), 200

        sql = f"UPDATE moradores SET {', '.join(set_clauses)} WHERE id = %s"
        values.append(morador_id)

        cursor.execute(sql, tuple(values))
        conn.commit()

        return jsonify({"message": "Morador atualizado com sucesso!"}), 200

    except mysql.connector.Error as err:
        conn.rollback()
        print(f"Erro no banco de dados ao atualizar morador: {err}")
        return jsonify({"error": f"Erro no banco de dados: {str(err)}"}), 500
    except Exception as e:
        conn.rollback()
        print(f"Erro interno ao atualizar morador: {e}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/moradores/<int:morador_id>/status", methods=["PUT"])
@token_required
def toggle_morador_status(morador_id):
    if not check_permission(['ADMIN']): # Somente ADMIN pode alterar status de morador
        return jsonify({"error": "Acesso negado. Apenas administradores podem alterar o status de moradores."}), 403
    data = request.get_json()
    if 'ativo' not in data or not isinstance(data['ativo'], bool):
        return jsonify({"error": "Status 'ativo' (booleano) é obrigatório."}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id FROM moradores WHERE id = %s", (morador_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Morador não encontrado."}), 404

        sql = "UPDATE moradores SET ativo = %s WHERE id = %s"
        cursor.execute(sql, (data['ativo'], morador_id))
        conn.commit()

        status_msg = "ativado" if data['ativo'] else "inativado"
        return jsonify({"message": "Morador %s com sucesso!" % status_msg}), 200

    except mysql.connector.Error as err:
        conn.rollback()
        print(f"Erro no banco de dados ao alterar status do morador: {err}")
        return jsonify({"error": f"Erro no banco de dados: {str(err)}"}), 500
    except Exception as e:
        conn.rollback()
        print(f"Erro interno ao alterar status do morador: {e}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/reservas/resumo-geral", methods=["GET"])
@token_required
def get_all_reservations_summary():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Erro de conexão com o banco de dados."}), 500

    cursor = conn.cursor(dictionary=True)

    try:
        sql = """
            SELECT
                r.nome_espaco AS space_name,
                r.data_reserva AS reservation_date,
                r.status,
                m.nome_completo AS resident_name,
                CONCAT(u.bloco, '-', u.numero) AS unit_number,
                r.nome_espaco AS space_id
            FROM reservas r
            LEFT JOIN moradores m ON r.morador_id = m.id
            LEFT JOIN unidades u ON m.unidade_id = u.id
            WHERE r.status IN ('Aprovada', 'Pendente')
            ORDER BY r.data_reserva ASC
        """
        cursor.execute(sql)
        reservas = cursor.fetchall()

        for reserva in reservas:
            if isinstance(reserva['reservation_date'], datetime.date):
                reserva['reservation_date'] = reserva['reservation_date'].isoformat()

        return jsonify(reservas), 200

    except Exception as e:
        print(f"Erro ao buscar resumo geral de reservas: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- ROTAS PARA ENCOMENDAS ---
@app.route("/api/encomendas", methods=["POST"])
@token_required
def add_encomenda():
    current_user_identity = request.user_identity
    registrado_por_admin_id = current_user_identity.get('user_id')
    user_role = current_user_identity.get('role')

    if not check_permission(['ADMIN']): # Somente ADMIN pode cadastrar encomendas
        return jsonify({"error": "Apenas administradores podem cadastrar encomendas."}), 403

    data = request.get_json()
    required_fields = ['remetente', 'data_chegada', 'morador_id', 'unidade_destino_id']
    if not all(k in data for k in required_fields):
        missing = [k for k in required_fields if k not in data]
        return jsonify({"error": f"Dados incompletos. Campos obrigatórios: {', '.join(missing)}"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id FROM moradores WHERE id = %s", (data['morador_id'],))
        morador_exists = cursor.fetchone()
        if not morador_exists:
            return jsonify({"error": "Morador destinatário não encontrado."}), 400

        cursor.execute("SELECT id FROM unidades WHERE id = %s", (data['unidade_destino_id'],))
        if not cursor.fetchone():
            return jsonify({"error": "Unidade de destino não encontrada ou inválida."}), 400

        sql = """
            INSERT INTO encomendas (remetente, descricao, data_chegada, morador_id, unidade_destino_id, registrado_por_admin_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (
            data['remetente'],
            data.get('descricao'),
            data['data_chegada'],
            data['morador_id'],
            data['unidade_destino_id'],
            registrado_por_admin_id
        ))
        conn.commit()
        return jsonify({"message": "Encomenda cadastrada com sucesso!"}), 201
    except mysql.connector.Error as err:
        conn.rollback()
        print(f"Erro no banco de dados ao adicionar encomenda: {err}")
        return jsonify({"error": f"Erro no banco de dados: {str(err)}"}), 500
    except Exception as e:
        conn.rollback()
        print(f"Erro interno ao adicionar encomenda: {e}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/encomendas", methods=["GET"])
@token_required
def get_encomendas():
    current_user_identity = request.user_identity
    user_role = current_user_identity.get('role')

    if not check_permission(['ADMIN']): # Somente ADMIN pode listar todas as encomendas
        return jsonify({"error": "Apenas administradores podem listar todas as encomendas."}), 403

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
    cursor = conn.cursor(dictionary=True)

    try:
        search_term = request.args.get('search_term')

        sql_query = """
            SELECT
                e.id, e.remetente, e.descricao, e.data_chegada, e.status, e.data_retirada,
                e.morador_id, e.unidade_destino_id, e.registrado_por_admin_id, e.criado_em,
                m.nome_completo as morador_nome,
                u.numero as morador_unidade_numero,
                u.bloco as morador_unidade_bloco,
                u.tipo_unidade as morador_unidade_tipo
            FROM encomendas e
            LEFT JOIN moradores m ON e.morador_id = m.id
            LEFT JOIN unidades u ON e.unidade_destino_id = u.id
        """
        where_clauses = []
        query_params = []

        if search_term:
            search_pattern = f"%{search_term}%"
            where_clauses.append("""
                (e.remetente LIKE %s OR
                 e.descricao LIKE %s OR
                 m.nome_completo LIKE %s OR
                 u.numero LIKE %s OR
                 u.bloco LIKE %s OR
                 u.tipo_unidade LIKE %s)
            """)
            query_params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])

        if where_clauses:
            sql_query += " WHERE " + " AND ".join(where_clauses)

        sql_query += " ORDER BY e.data_chegada DESC, e.status ASC"

        cursor.execute(sql_query, tuple(query_params))
        encomendas = cursor.fetchall()

        return jsonify(encomendas), 200
    except mysql.connector.Error as err:
        print(f"Erro no banco de dados ao buscar encomendas: {err}")
        return jsonify({"error": f"Erro ao buscar encomendas: {str(err)}"}), 500
    except Exception as e:
        print(f"Erro interno do servidor ao buscar encomendas: {e}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/encomendas/<int:encomenda_id>/retirada", methods=["PUT"])
@token_required
def register_encomenda_retirada(encomenda_id):
    current_user_identity = request.user_identity
    user_role = current_user_identity.get('role')

    if not check_permission(['ADMIN']): # Somente ADMIN pode registrar retirada
        return jsonify({"error": "Apenas administradores podem registrar a retirada de encomendas."}), 403

    data = request.get_json()
    if not all(k in data for k in ['cpf', 'password', 'unidade_destino_id']):
        return jsonify({"error": "CPF, senha do morador e unidade de destino são obrigatórios para retirada."}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT e.id, e.morador_id, e.unidade_destino_id, e.status
            FROM encomendas e
            WHERE e.id = %s
        """, (encomenda_id,))
        encomenda_info = cursor.fetchone()

        if not encomenda_info:
            return jsonify({"error": "Encomenda não encontrada."}), 404
        if encomenda_info['status'] == 'Retirada':
            return jsonify({"error": "Encomenda já foi retirada."}), 409

        cursor.execute("""
            SELECT id, senha_hash, unidade_id
            FROM moradores
            WHERE cpf = %s AND ativo = TRUE
        """, (data['cpf'],))
        morador_auth_data = cursor.fetchone()

        if not morador_auth_data or not bcrypt.check_password_hash(morador_auth_data['senha_hash'], data['password']):
            return jsonify({"error": "CPF ou senha do morador inválidos."}), 401

        if encomenda_info['morador_id'] != UNREGISTERED_MORADOR_PLACEHOLDER_ID:
            if morador_auth_data['unidade_id'] != data['unidade_destino_id']:
                print(f"ERRO RETIRADA: Unidade do morador autenticado ({morador_auth_data['unidade_id']}) NÃO corresponde à unidade de destino da encomenda ({data['unidade_destino_id']}).")
                return jsonify({"error": "O morador autenticado não pertence à unidade de destino desta encomenda."}), 403
        else:
            print(f"DEBUG RETIRADA: Encomenda para morador placeholder ({UNREGISTERED_MORADOR_PLACEHOLDER_ID}). Validação de unidade IGNORADA.")
            pass

        sql_update = """
            UPDATE encomendas
            SET status = 'Retirada', data_retirada = CURDATE()
            WHERE id = %s
        """
        cursor.execute(sql_update, (encomenda_id,))
        conn.commit()

        return jsonify({"message": "Retirada da encomenda registrada com sucesso!"}), 200

    except mysql.connector.Error as err:
        conn.rollback()
        print(f"Erro no banco de dados ao registrar retirada: {err}")
        return jsonify({"error": f"Erro no banco de dados: {str(err)}"}), 500
    except Exception as e:
        conn.rollback()
        print(f"Erro interno ao registrar retirada: {e}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# --- ROTAS DE CRIAÇÃO (POST) (Já existentes, mantidas como estão ou ajustadas) ---
@app.route("/api/visitantes", methods=["POST"])
@token_required
def add_visitor():
    try:
        current_user_identity = request.user_identity
        user_id = current_user_identity.get('user_id')
        user_apt = current_user_identity.get('apt')

        data = request.get_json()
        required_fields = ['name', 'cpf', 'release_date', 'has_car']
        if not all(k in data for k in required_fields):
            return jsonify({"error": f"Dados incompletos: {', '.join(required_fields)} são obrigatórios."}), 400

        try:
            release_date_obj = datetime.datetime.strptime(data['release_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Formato de data inválido. Use AAAA-MM-DD."}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Erro de conexão com o banco de dados"}), 500
        cursor = conn.cursor(dictionary=True)

        sql_check = """
            SELECT data_liberacao
            FROM visitantes
            WHERE cpf = %s
            AND data_liberacao >= %s
            ORDER BY data_liberacao DESC
            LIMIT 1
        """
        cursor.execute(sql_check, (data['cpf'], release_date_obj))
        existing_liberation = cursor.fetchone()

        if existing_liberation:
            existing_date = existing_liberation['data_liberacao'].strftime('%d/%m/%Y')
            return jsonify({"error": f"CPF já liberado até {existing_date}"}), 409

        sql_insert = """
            INSERT INTO visitantes
                (nome_completo, cpf, data_liberacao, possui_veiculo, placa_veiculo, modelo_veiculo,
                cor_veiculo, unidade_visitada, observacoes, morador_id)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql_insert, (
            data['name'],
            data['cpf'],
            release_date_obj,
            data['has_car'],
            data.get('car_plate'),
            data.get('car_model'),
            data.get('car_color'),
            user_apt,
            data.get('observations'),
            user_id
        ))
        conn.commit()
        return jsonify({"message": "Visitante registrado com sucesso!"}), 201
    except mysql.connector.Error as err:
        conn.rollback()
        print(f"Erro no banco de dados ao adicionar visitante: {err}")
        return jsonify({"error": f"Erro no banco de dados: {str(err)}"}), 500
    except Exception as e:
        conn.rollback()
        print(f"Erro ao registrar visitante: {e}")
        return jsonify({"error": f"Erro ao registrar visitante: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/ocorrencias", methods=["POST"])
@token_required
def add_occurrence():
    try:
        current_user_identity = request.user_identity
        user_id = current_user_identity.get('user_id')

        data = request.get_json()
        if not all(k in data for k in ['occurrence_type', 'description', 'occurrence_date']):
            return jsonify({"error": "Dados incompletos: tipo, descrição e data da ocorrência são obrigatórios."}), 400

        occurrence_type = data.get('custom_type', data['occurrence_type']) if data['occurrence_type'] == 'Outro' else data['occurrence_type']

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
        cursor = conn.cursor()
        sql = """
            INSERT INTO ocorrencias
                (tipo_ocorrencia, descricao, localizacao, data_ocorrencia, morador_id)
            VALUES
                (%s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (
            occurrence_type,
            data['description'],
            data.get('location'),
            data['occurrence_date'],
            user_id
        ))
        conn.commit()
        return jsonify({"message": "Ocorrência registrada com sucesso!"}), 201
    except Exception as e:
        conn.rollback();
        print(f"Erro ao registrar ocorrência: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/reservas", methods=["POST"])
@token_required
def add_reservation():
    conn = None
    cursor = None
    try:
        current_user_identity = request.user_identity
        user_id = current_user_identity.get('user_id')

        data = request.get_json()
        if not all(k in data for k in ['space_name', 'reservation_date']):
            return jsonify({"error": "Dados incompletos: nome do espaço e data da reserva são obrigatórios."}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
        cursor = conn.cursor(dictionary=True)

        check_sql = """
            SELECT status
            FROM reservas
            WHERE nome_espaco = %s AND data_reserva = %s
        """
        cursor.execute(check_sql, (data['space_name'], data['reservation_date']))
        existing_reservation = cursor.fetchone()

        if existing_reservation:
            if existing_reservation['status'] == 'Aprovada':
                return jsonify({"error": "Espaço já reservado para esta data e status 'Aprovada'."}), 409
            else:
                return jsonify({"error": "Já existe uma reserva pendente para esta data."}), 409

        cursor.execute("SELECT email FROM moradores WHERE id = %s", (user_id,))
        morador_record = cursor.fetchone()
        if not morador_record:
            raise Exception("Morador não encontrado para o ID fornecido no token.")
        user_email = morador_record['email']

        sql_insert = """
            INSERT INTO reservas
                (nome_espaco, data_reserva, status, morador_id)
            VALUES
                (%s, %s, 'Pendente', %s)
        """
        cursor.execute(sql_insert, (data['space_name'], data['reservation_date'], user_id))
        reserva_id = cursor.lastrowid
        conn.commit()
        print(f"Reserva #{reserva_id} criada como 'Pendente'.")

        if reserva_id:
            payment_amount = 0.10
            payment_data = {
                "transaction_amount": payment_amount,
                "description": f"Taxa de reserva para {data['space_name']} em {data['reservation_date']}",
                "payment_method_id": "pix",
                "payer": { "email": user_email },
                "notification_url": f"https://67ff-2804-1128-bd48-a100-84f0-612c-d46b-f966.ngrok-free.app/api/webhooks/mercadopago",
                "external_reference": str(reserva_id)
            }
            payment_response = sdk.payment().create(payment_data)

            if payment_response["status"] == 201:
                payment = payment_response["response"]
                pix_data = {
                    "payment_id": payment["id"],
                    "qr_code_image": payment["point_of_interaction"]["transaction_data"]["qr_code_base64"],
                    "qr_code_text": payment["point_of_interaction"]["transaction_data"]["qr_code"]
                }
                return jsonify(pix_data), 201
            else:
                conn.rollback()
                raise Exception(payment_response["response"].get("message", "Erro desconhecido no Mercado Pago."))
        else:
             return jsonify({"error": "Erro inesperado ao criar reserva."}), 500

    except mysql.connector.Error as err:
        if conn and conn.is_connected():
            conn.rollback()
        print(f"Erro no banco de dados ao criar reserva: {err}")
        return jsonify({"error": f"Erro no banco de dados: {str(err)}"}), 500
    except Exception as e:
        if conn and conn.is_connected():
            conn.rollback()
        print(f"Erro geral ao adicionar reserva: {e}")
        return jsonify({"error": f"Falha ao criar reserva ou gerar pagamento: {e}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

# --- ROTAS DE LEITURA (GET) ---
@app.route("/api/minhas-reservas", methods=["GET"])
@token_required
def get_my_reservations():
    try:
        current_user_identity = request.user_identity
        user_id = current_user_identity.get('user_id')

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, nome_espaco as space_name, data_reserva as reservation_date, status
            FROM reservas
            WHERE morador_id = %s
            ORDER BY data_reserva DESC
        """, (user_id,))
        reservas = cursor.fetchall()
        return jsonify(reservas), 200
    except Exception as e:
        print(f"Erro ao buscar minhas reservas: {e}")
        return jsonify({"error": f"Erro ao buscar reservas: {e}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/meus-visitantes", methods=["GET"])
@token_required
def get_my_visitors():
    try:
        current_user_identity = request.user_identity
        user_id = current_user_identity.get('user_id')

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, nome_completo as name, cpf, data_liberacao as release_date
            FROM visitantes
            WHERE morador_id = %s
            ORDER BY data_liberacao DESC
        """, (user_id,))
        visitantes = cursor.fetchall()
        return jsonify(visitantes), 200
    except Exception as e:
        print(f"Erro ao buscar meus visitantes: {e}")
        return jsonify({"error": f"Erro ao buscar visitantes: {e}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

# --- NOVA ROTA: MINHAS ENCOMENDAS ---
@app.route("/api/minhas-encomendas", methods=["GET"])
@token_required
def get_my_encomendas():
    current_user_identity = request.user_identity
    user_id = current_user_identity.get('user_id')
    user_role = current_user_identity.get('role')

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
    cursor = conn.cursor(dictionary=True)

    try:
        if user_role == 'ADMIN':
            return jsonify([]), 200

        sql = """
            SELECT
                e.id, e.remetente, e.descricao, e.data_chegada, e.status, e.data_retirada,
                e.morador_id, e.unidade_destino_id, e.registrado_por_admin_id, e.criado_em,
                m.nome_completo as morador_nome,
                u.numero as morador_unidade_numero,
                u.bloco as morador_unidade_bloco,
                u.tipo_unidade as morador_unidade_tipo
            FROM encomendas e
            LEFT JOIN moradores m ON e.morador_id = m.id
            LEFT JOIN unidades u ON e.unidade_destino_id = u.id
            WHERE e.morador_id = %s AND e.morador_id != %s
            ORDER BY e.data_chegada DESC, e.status ASC
        """
        cursor.execute(sql, (user_id, UNREGISTERED_MORADOR_PLACEHOLDER_ID))
        encomendas = cursor.fetchall()

        return jsonify(encomendas), 200
    except Exception as e:
        print(f"Erro ao buscar minhas encomendas: {e}")
        return jsonify({"error": f"Erro ao buscar minhas encomendas: {e}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# --- RESUMO DE OCORRÊNCIAS ---
@app.route("/api/ocorrencias/resumo", methods=["GET"])
@token_required
def get_occurrences_summary():
    try:
        request.user_identity

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
        cursor = conn.cursor(dictionary=True)

        sql = """
            SELECT tipo_ocorrencia as occurrence_type, COUNT(*) as count
            FROM ocorrencias
            WHERE status = 'Aberto'
            GROUP BY tipo_ocorrencia
            ORDER BY count DESC
        """
        cursor.execute(sql)
        resumo = cursor.fetchall()
        return jsonify(resumo), 200
    except Exception as e:
        print(f"Erro ao buscar resumo de ocorrências: {e}")
        return jsonify({"error": f"Erro ao buscar resumo de ocorrências: {e}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/reservations/booked-dates", methods=["GET"])
@token_required
def get_booked_dates():
    try:
        request.user_identity

        space_name = request.args.get('space')
        if not space_name:
            return jsonify({"error": "Nome do espaço não fornecido."}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
        cursor = conn.cursor()

        sql = "SELECT data_reserva FROM reservas WHERE nome_espaco = %s AND status = 'Aprovada'"
        cursor.execute(sql, (space_name,))
        datas_reservadas = [item[0].strftime('%Y-%m-%d') for item in cursor.fetchall()]
        return jsonify(datas_reservadas), 200
    except Exception as e:
        print(f"Erro ao buscar datas reservadas: {e}")
        return jsonify({"error": f"Erro ao buscar datas reservadas: {e}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

# --- ROTAS CRUD PARA AVISOS ---
@app.route("/api/avisos", methods=["POST"])
@token_required
def add_aviso():
    current_user_identity = request.user_identity
    registrado_por_user_id = current_user_identity.get('user_id')
    user_role = current_user_identity.get('role')

    if not check_permission(['ADMIN', 'PORTARIA']):
        return jsonify({"error": "Acesso negado. Apenas administradores ou portarias podem postar avisos."}), 403

    data = request.get_json()
    required_fields = ['titulo', 'conteudo']
    if not all(k in data for k in required_fields):
        missing = [k for k in required_fields if k not in data]
        return jsonify({"error": f"Dados incompletos. Campos obrigatórios: {', '.join(missing)}"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
    cursor = conn.cursor()

    try:
        sql = """
            INSERT INTO avisos (titulo, conteudo, imagem_url, prioridade, data_expiracao, data_publicacao, registrado_por_user_id, registrado_por_user_role, ativo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
        """
        # Converte a data_expiracao para objeto datetime se não for nula, senão None
        data_expiracao_obj = datetime.datetime.strptime(data['data_expiracao'], '%Y-%m-%d') if data.get('data_expiracao') else None

        cursor.execute(sql, (
            data['titulo'],
            data['conteudo'],
            data.get('imagem_url'),
            data.get('prioridade', 0),
            data_expiracao_obj,
            datetime.datetime.utcnow(),  # ESTE É O PARÂMETRO QUE FALTAVA
            registrado_por_user_id,
            user_role, # ESTE É O NOVO PARÂMETRO ADICIONADO AGORA
            # 'ativo' é TRUE por padrão na SQL, então não precisa ser passado como parâmetro.
            # O número de %s e de parâmetros agora casa.
        ))
        conn.commit()
        return jsonify({"message": "Aviso postado com sucesso!"}), 201
    except mysql.connector.Error as err:
        conn.rollback()
        print(f"Erro no banco de dados ao adicionar aviso: {err}")
        return jsonify({"error": f"Erro no banco de dados: {str(err)}"}), 500
    except Exception as e:
        conn.rollback()
        print(f"Erro interno ao adicionar aviso: {e}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/avisos", methods=["GET"])
@token_required
def get_all_avisos():
    """
    Retorna a lista de avisos ATIVOS.
    Avisos inativos não serão retornados por esta rota, independentemente do papel do usuário.
    Se precisar de uma rota para ADMIN/PORTARIA ver TODOS os avisos (ativos e inativos),
    crie uma rota separada como /api/avisos/todos.
    """
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
    cursor = conn.cursor(dictionary=True)

    try:
        sql = """
            SELECT
                id, titulo, conteudo, imagem_url, prioridade,
                data_publicacao, data_expiracao, registrado_por_user_id,
                registrado_por_user_role, ativo
            FROM avisos
            WHERE ativo = TRUE -- Adicionado o filtro para avisos ativos
            ORDER BY prioridade DESC, data_publicacao DESC
        """
        cursor.execute(sql)
        avisos = cursor.fetchall()

        # Converte objetos datetime para string ISO format
        for aviso in avisos:
            if isinstance(aviso['data_publicacao'], datetime.datetime):
                aviso['data_publicacao'] = aviso['data_publicacao'].isoformat()
            if isinstance(aviso['data_expiracao'], datetime.datetime):
                aviso['data_expiracao'] = aviso['data_expiracao'].isoformat()
        return jsonify(avisos), 200
    except Exception as e:
        print(f"Erro ao buscar avisos: {e}")
        return jsonify({"error": f"Erro ao buscar avisos: {e}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/avisos/<int:aviso_id>", methods=["GET"])
@token_required
def get_aviso_by_id(aviso_id):
    """
    Retorna um aviso específico pelo ID.
    """
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
    cursor = conn.cursor(dictionary=True)

    try:
        sql = """
            SELECT
                id, titulo, conteudo, imagem_url, prioridade,
                data_publicacao, data_expiracao, registrado_por_user_id,
                registrado_por_user_role, ativo
            FROM avisos
            WHERE id = %s
        """
        cursor.execute(sql, (aviso_id,))
        aviso = cursor.fetchone()

        if not aviso:
            return jsonify({"error": "Aviso não encontrado."}), 404

        if isinstance(aviso['data_publicacao'], datetime.datetime):
            aviso['data_publicacao'] = aviso['data_publicacao'].isoformat()
        if isinstance(aviso['data_expiracao'], datetime.datetime):
            aviso['data_expiracao'] = aviso['data_expiracao'].isoformat()

        return jsonify(aviso), 200
    except Exception as e:
        print(f"Erro ao buscar aviso por ID: {e}")
        return jsonify({"error": f"Erro ao buscar aviso: {e}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

@app.route("/api/avisos/<int:aviso_id>", methods=["PUT"])
@token_required
def update_aviso(aviso_id):
    """
    Atualiza um aviso existente.
    Requer autenticação JWT (espera ADMIN ou PORTARIA para essa ação).
    """
    if not check_permission(['ADMIN', 'PORTARIA']):
        return jsonify({"error": "Acesso negado. Apenas administradores ou portarias podem atualizar avisos."}), 403

    data = request.get_json()
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id FROM avisos WHERE id = %s", (aviso_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Aviso não encontrado."}), 404

        set_clauses = []
        values = []

        if 'titulo' in data:
            set_clauses.append("titulo = %s")
            values.append(data['titulo'])
        if 'conteudo' in data:
            set_clauses.append("conteudo = %s")
            values.append(data['conteudo'])
        if 'imagem_url' in data:
            set_clauses.append("imagem_url = %s")
            values.append(data['imagem_url'])
        if 'prioridade' in data:
            set_clauses.append("prioridade = %s")
            values.append(data['prioridade'])
        if 'data_expiracao' in data: # Permite que seja None
            data_expiracao_obj = datetime.datetime.strptime(data['data_expiracao'], '%Y-%m-%d') if data['data_expiracao'] else None
            set_clauses.append("data_expiracao = %s")
            values.append(data_expiracao_obj)
        if 'ativo' in data: # Permite alternar ativo/inativo
            set_clauses.append("ativo = %s")
            values.append(bool(data['ativo']))

        if not set_clauses:
            return jsonify({"message": "Nenhum dado para atualizar."}), 200

        sql = f"UPDATE avisos SET {', '.join(set_clauses)} WHERE id = %s"
        values.append(aviso_id)

        cursor.execute(sql, tuple(values))
        conn.commit()

        return jsonify({"message": "Aviso atualizado com sucesso!"}), 200
    except mysql.connector.Error as err:
        conn.rollback()
        print(f"Erro no banco de dados ao atualizar aviso: {err}")
        return jsonify({"error": f"Erro no banco de dados: {str(err)}"}), 500
    except Exception as e:
        conn.rollback()
        print(f"Erro interno ao atualizar aviso: {e}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

# Rota para INATIVAR um aviso (SUBSTITUI O DELETE)
@app.route('/api/avisos/inativar/<int:aviso_id>', methods=['PUT'])
@token_required
def inativate_aviso(aviso_id):
    if not check_permission(['ADMIN', 'PORTARIA']):
        return jsonify({"error": "Acesso negado. Apenas administradores e portarias podem inativar avisos."}), 403

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Erro de conexão com o banco de dados."}), 500
    cursor = conn.cursor()

    try:
        # AQUI ESTÁ A CORREÇÃO: Remova a linha Aviso.query.get(aviso_id)
        # e use apenas a lógica do cursor.execute

        cursor.execute("SELECT id, ativo FROM avisos WHERE id = %s", (aviso_id,))
        aviso_data = cursor.fetchone() # Fetches a tuple (id, ativo_status)

        if not aviso_data:
            return jsonify({"error": "Aviso não encontrado."}), 404
        
        # aviso_data[1] é o valor da coluna 'ativo' (True ou False)
        if not aviso_data[1]: 
            return jsonify({"message": "Aviso já está inativo."}), 200

        cursor.execute("UPDATE avisos SET ativo = FALSE WHERE id = %s", (aviso_id,))
        conn.commit()
        return jsonify({"message": "Aviso inativado com sucesso!"}), 200
    except mysql.connector.Error as err:
        conn.rollback()
        print(f"Erro no banco de dados ao inativar aviso: {err}")
        return jsonify({"error": f"Erro no banco de dados: {str(err)}"}), 500
    except Exception as e:
        conn.rollback()
        print(f"Erro interno ao inativar aviso: {e}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)