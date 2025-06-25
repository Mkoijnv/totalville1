import mysql.connector
# A importação pode falhar se 'app.py' ainda não estiver definido, mas é necessária para a execução em conjunto.
# Em um cenário real, a configuração de conexão poderia estar em um arquivo separado.
from app import get_db_connection 

def configurar_banco_de_dados():
    """
    Cria e configura as tabelas do banco de dados com a estrutura correta,
    incluindo 'unidades', 'moradores', e 'encomendas' com a nova coluna.
    Também insere o morador placeholder "Ainda Não Cadastrado".
    """
    conn = get_db_connection()
    if not conn:
        print("❌ Não foi possível conectar ao banco de dados para a configuração.")
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

        # 5. Ocorrências e 6. Reservas
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

        # 7. Tabela de Encomendas
        print("Verificando/Criando tabela 'encomendas'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS encomendas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            remetente VARCHAR(100) NOT NULL,
            descricao TEXT,
            data_chegada DATE NOT NULL,
            status ENUM('Na Administração', 'Retirada') NOT NULL DEFAULT 'Na Administração',
            data_retirada DATE,
            morador_id INT, -- Morador a quem a encomenda se destina (pode ser o placeholder)
            unidade_destino_id INT NOT NULL, -- NOVO CAMPO: ID da unidade de destino da encomenda
            registrado_por_admin_id INT, -- Quem registrou (se tiver tabela de admins)
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (morador_id) REFERENCES moradores(id) ON DELETE SET NULL,
            FOREIGN KEY (unidade_destino_id) REFERENCES unidades(id) ON DELETE CASCADE, -- Chave estrangeira para a unidade de destino
            FOREIGN KEY (registrado_por_admin_id) REFERENCES administradores(id) ON DELETE SET NULL
        ) ENGINE=InnoDB;
        """)
        print("-> Tabela 'encomendas' OK.")

        # --- INSERÇÕES INICIAIS ---

        # Inserir morador placeholder "Ainda Não Cadastrado"
        # O ID deve ser capturado no frontend e backend para uso na lógica.
        # CPF e email são únicos, então usamos INSERT IGNORE para não duplicar se já existir.
        UNREGISTERED_MORADOR_EMAIL = 'nao_cadastrado@placeholder.com'
        UNREGISTERED_MORADOR_CPF = '000.000.000-00'
        # Senha "123" hasheada
        UNREGISTERED_MORADOR_HASH = '$2b$12$hScMEf.D2VWJInYcXM4Zt.yufmvJhxbNEYPmuoVPAmsIpOjc4rIQS'

        print(f"Inserindo/Verificando morador placeholder '{UNREGISTERED_MORADOR_EMAIL}'...")
        cursor.execute("""
            INSERT IGNORE INTO moradores (id, nome_completo, email, senha_hash, unidade_id, cpf, rg, profissao, whatsapp, tipo_morador, ativo)
            VALUES (1, 'Morador Não Cadastrado', %s, %s, NULL, %s, NULL, NULL, NULL, 'outro', FALSE)
        """, (UNREGISTERED_MORADOR_EMAIL, UNREGISTERED_MORADOR_HASH, UNREGISTERED_MORADOR_CPF))
        # Se o ID 1 já estiver ocupado ou você quiser um ID específico maior, 
        # remova 'id' do INSERT e recupere o cursor.lastrowid para saber qual ID foi gerado.
        # No frontend, você terá que buscar esse ID ou defini-lo estaticamente se for fixo no seu DB.
        
        # Opcional: Inserir um administrador padrão se não existir
        ADMIN_EMAIL = 'admin@condominio.com'
        ADMIN_HASH = '$2b$12$hScMEf.D2VWJInYcXM4Zt.yufmvJhxbNEYPmuoVPAmsIpOjc4rIQS' # Senha "123"
        print(f"Inserindo/Verificando administrador padrão '{ADMIN_EMAIL}'...")
        cursor.execute("""
            INSERT IGNORE INTO administradores (nome, email, senha_hash, permissao, ativo)
            VALUES ('Administrador Master', %s, %s, 'ADM', TRUE)
        """, (ADMIN_EMAIL, ADMIN_HASH))

        # Opcional: Inserir algumas unidades de exemplo se não existirem
        print("Inserindo/Verificando unidades de exemplo...")
        cursor.execute("""
            INSERT IGNORE INTO unidades (tipo_unidade, bloco, numero, andar, ocupada) VALUES 
            ('apartamento', 'A', '101', 1, TRUE),
            ('apartamento', 'A', '102', 1, FALSE),
            ('casa', NULL, '01', NULL, TRUE),
            ('casa', NULL, '02', NULL, FALSE);
        """)
        
        conn.commit()
        print("\n✅ Configuração do banco de dados (versão correta) concluída com sucesso!")

    except mysql.connector.Error as e:
        print(f"❌ Erro durante a configuração do banco: {e}")
        conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()
        print("🔌 Conexão com o MySQL foi fechada.")


if __name__ == '__main__':
    configurar_banco_de_dados()
