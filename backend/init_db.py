import mysql.connector
# A importação pode falhar se 'app.py' ainda não estiver definido, mas é necessária para a execução em conjunto.
# Em um cenário real, a configuração de conexão poderia estar em um arquivo separado.
from app import get_db_connection 

def configurar_banco_de_dados():
    """
    Cria e configura as tabelas do banco de dados com a estrutura correta,
    incluindo 'unidades' e a relação com 'moradores'.
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

        conn.commit()
        print("\n✅ Configuração do banco de dados (versão correta) concluída com sucesso!")

    except mysql.connector.Error as e:
        print(f"❌ Erro durante a configuração do banco: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
        print("🔌 Conexão com o MySQL foi fechada.")


if __name__ == '__main__':
    configurar_banco_de_dados()
