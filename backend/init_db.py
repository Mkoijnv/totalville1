import mysql.connector # Mantenha apenas este import se não usar 'os' ou 'dotenv'

# Definição de get_db_connection para este script, com credenciais fixas.
def get_db_connection_for_config():
    try:
        conn = mysql.connector.connect(
            host='db',              # HOST: 'db' (dentro da rede Docker)
            user='root',            # USUÁRIO: 'root'
            password='admin123',    # SENHA: 'admin123' (a do seu docker-compose.yml)
            database='totalville1', # NOME DO BANCO: 'totalville1'
            charset='utf8mb4'
        )
        print("✅ Conexão bem-sucedida ao MySQL!") # Adicionar para depuração
        return conn
    except mysql.connector.Error as err:
        print(f"❌ Erro ao conectar ao MySQL: {err}")
        if err.errno == mysql.connector.errorcode.CR_CONN_HOST_ERROR:
            print(f"DEBUG: Não foi possível conectar ao host 'db'. O host ou a porta podem estar incorretos, ou o servidor MySQL não está respondendo.")
        elif err.errno == mysql.connector.errorcode.ER_ACCESS_DENIED_ERROR:
            print(f"DEBUG: Acesso negado. Verifique usuário e senha fixados no script.")
        return None

def configurar_banco_de_dados():
    """
    Cria e configura as tabelas do banco de dados.
    """
    # Para criar o banco de dados, precisamos nos conectar ao servidor MySQL sem especificar um DB inicialmente.
    try:
        temp_conn = mysql.connector.connect( # Note: era mysql.connector.connector, corrigido para mysql.connector
            host='db',              # HOST: 'db'
            user='root',            # USUÁRIO: 'root'
            password='admin123',    # SENHA: 'admin123'
            # Não especifica o 'database' aqui, pois o objetivo é criá-lo
            charset='utf8mb4' # Manter charset para a conexão
        )
        temp_cursor = temp_conn.cursor()

        db_name = 'totalville1' # Nome do banco de dados fixo

        print(f"Verificando/Criando banco de dados '{db_name}'...")
        temp_cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        print(f"-> Banco de dados '{db_name}' OK.")

        temp_cursor.close()
        temp_conn.close()

    except mysql.connector.Error as err:
        print(f"❌ Erro ao conectar ou criar o banco de dados: {err}")
        if err.errno == mysql.connector.errorcode.CR_CONN_HOST_ERROR:
            print(f"DEBUG: Não foi possível conectar ao host 'db'. O host ou a porta podem estar incorretos, ou o servidor MySQL não está respondendo.")
        elif err.errno == mysql.connector.errorcode.ER_ACCESS_DENIED_ERROR:
            print(f"DEBUG: Acesso negado. Verifique usuário e senha fixados no script.")
        return
    except Exception as e:
        print(f"❌ Erro inesperado ao criar o banco de dados: {e}")
        return

    # Agora, podemos obter a conexão para o banco de dados recém-criado/existente
    conn = get_db_connection_for_config()
    if not conn:
        print("❌ Não foi possível conectar ao banco de dados para a configuração das tabelas.")
        return

    cursor = conn.cursor()

    try:
        # 1. Tabela de Administradores
        print("Verificando/Criando tabela 'administradores'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS administradores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            senha_hash VARCHAR(255) NOT NULL,
            permissao VARCHAR(50) NOT NULL DEFAULT 'ADM',
            ativo BOOLEAN NOT NULL DEFAULT TRUE,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
        """)
        print("-> Tabela 'administradores' OK.")

        # 2. Tabela de Unidades (Casas ou Apartamentos)
        print("Verificando/Criando tabela 'unidades'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS unidades (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tipo_unidade ENUM('casa', 'apartamento') NOT NULL,
            bloco VARCHAR(10),
            numero VARCHAR(10) NOT NULL,
            andar INT,
            ocupada BOOLEAN DEFAULT TRUE,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_unidade (tipo_unidade, bloco, numero)
        ) ENGINE=InnoDB;
        """)
        print("-> Tabela 'unidades' OK.")

        # 3. Tabela de Moradores com FK para Unidades
        print("Verificando/Criando tabela 'moradores'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS moradores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome_completo VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            senha_hash VARCHAR(255) NOT NULL,
            unidade_id INT,
            cpf VARCHAR(14) UNIQUE,
            rg VARCHAR(20),
            profissao VARCHAR(100),
            whatsapp VARCHAR(20),
            tipo_morador ENUM('proprietario', 'inquilino', 'outro') DEFAULT 'outro',
            ativo BOOLEAN NOT NULL DEFAULT TRUE,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB;
        """)
        print("-> Tabela 'moradores' OK.")

        # 4. Tabela de Visitantes
        print("Verificando/Criando tabela 'visitantes'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS visitantes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome_completo VARCHAR(255) NOT NULL,
            cpf VARCHAR(14) NOT NULL,
            data_liberacao DATE NOT NULL,
            possui_veiculo BOOLEAN DEFAULT FALSE,
            placa_veiculo VARCHAR(10),
            modelo_veiculo VARCHAR(50),
            cor_veiculo VARCHAR(30),
            unidade_visitada VARCHAR(50) NOT NULL,
            observacoes TEXT,
            morador_id INT,
            registrado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (morador_id) REFERENCES moradores(id) ON DELETE SET NULL,
            UNIQUE KEY uk_visitante_cpf_data (cpf, data_liberacao)
        ) ENGINE=InnoDB;
        """)
        print("-> Tabela 'visitantes' OK.")

        # 5. Tabela de Ocorrências
        print("Verificando/Criando tabela 'ocorrencias'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS ocorrencias (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tipo_ocorrencia VARCHAR(255) NOT NULL,
            descricao TEXT NOT NULL,
            localizacao VARCHAR(255),
            data_ocorrencia DATETIME NOT NULL,
            status VARCHAR(50) DEFAULT 'Aberto',
            morador_id INT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (morador_id) REFERENCES moradores(id) ON DELETE SET NULL
        ) ENGINE=InnoDB;
        """)
        print("-> Tabela 'ocorrencias' OK.")

        # 6. Tabela de Reservas
        print("Verificando/Criando tabela 'reservas'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reservas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome_espaco VARCHAR(255) NOT NULL,
            data_reserva DATE NOT NULL,
            status VARCHAR(50) DEFAULT 'Pendente',
            morador_id INT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (morador_id) REFERENCES moradores(id) ON DELETE SET NULL,
            UNIQUE KEY uk_reserva_espaco_data (nome_espaco, data_reserva)
        ) ENGINE=InnoDB;
        """)
        print("-> Tabela 'reservas' OK.")

        # 7. Tabela de Avisos (COM CONFIGURAÇÃO UTF8MB4)
        print("Verificando/Criando tabela 'avisos'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS avisos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
            conteudo TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
            imagem_url VARCHAR(2048),
            prioridade INT DEFAULT 0,
            data_publicacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            data_expiracao DATETIME,
            registrado_por_user_id INT,
            registrado_por_user_role VARCHAR(50),
            ativo BOOLEAN NOT NULL DEFAULT TRUE,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (registrado_por_user_id) REFERENCES administradores(id) ON DELETE SET NULL
        ) ENGINE=InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
        """)
        print("-> Tabela 'avisos' OK (com UTF8MB4).")

        # 8. Tabela de Encomendas
        print("Verificando/Criando tabela 'encomendas'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS encomendas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            remetente VARCHAR(100) NOT NULL,
            descricao TEXT,
            data_chegada DATE NOT NULL,
            status ENUM('Na Administração', 'Retirada') NOT NULL DEFAULT 'Na Administração',
            data_retirada DATE,
            morador_id INT,
            unidade_destino_id INT NOT NULL,
            registrado_por_admin_id INT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (morador_id) REFERENCES moradores(id) ON DELETE SET NULL,
            FOREIGN KEY (unidade_destino_id) REFERENCES unidades(id) ON DELETE CASCADE,
            FOREIGN KEY (registrado_por_admin_id) REFERENCES administradores(id) ON DELETE SET NULL
        ) ENGINE=InnoDB;
        """)
        print("-> Tabela 'encomendas' OK.")

        # --- INSERÇÕES INICIAIS ---

        # Inserir morador placeholder "Ainda Não Cadastrado"
        UNREGISTERED_MORADOR_EMAIL = 'nao_cadastrado@placeholder.com'
        UNREGISTERED_MORADOR_CPF = '000.000.000-00'
        UNREGISTERED_MORADOR_HASH = '$2b$12$hScMEf.D2VWJInYcXM4Zt.yufmvJhxbNEYPmuoVPAmsIpOjc4rIQS'

        print(f"Inserindo/Verificando morador placeholder '{UNREGISTERED_MORADOR_EMAIL}'...")
        cursor.execute("""
            INSERT IGNORE INTO moradores (id, nome_completo, email, senha_hash, unidade_id, cpf, rg, profissao, whatsapp, tipo_morador, ativo)
            VALUES (1, 'Morador Não Cadastrado', %s, %s, NULL, %s, NULL, NULL, NULL, 'outro', FALSE)
        """, (UNREGISTERED_MORADOR_EMAIL, UNREGISTERED_MORADOR_HASH, UNREGISTERED_MORADOR_CPF))

        ADMIN_EMAIL = 'admin@condominio.com'
        ADMIN_HASH = '$2b$12$hScMEf.D2VWJInYcXM4Zt.yufmvJhxbNEYPmuoVPAmsIpOjc4rIQS'
        print(f"Inserindo/Verificando administrador padrão '{ADMIN_EMAIL}'...")
        cursor.execute("""
            INSERT IGNORE INTO administradores (nome, email, senha_hash, permissao, ativo)
            VALUES ('Administrador Master', %s, %s, 'ADM', TRUE)
        """, (ADMIN_EMAIL, ADMIN_HASH))

        print("Inserindo/Verificando unidades de exemplo...")
        cursor.execute("""
            INSERT IGNORE INTO unidades (tipo_unidade, bloco, numero, andar, ocupada) VALUES 
            ('apartamento', 'A', '101', 1, TRUE),
            ('apartamento', 'A', '102', 1, FALSE),
            ('casa', NULL, '01', NULL, TRUE),
            ('casa', NULL, '02', NULL, FALSE);
        """)

        conn.commit()
        print("\n✅ Configuração do banco de dados concluída com sucesso!")

    except mysql.connector.Error as e:
        print(f"❌ Erro durante a configuração das tabelas: {e}")
        conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()
        print("🔌 Conexão com o MySQL foi fechada.")

if __name__ == '__main__':
    print("🚀 Iniciando script init_db.py...")
    configurar_banco_de_dados()
