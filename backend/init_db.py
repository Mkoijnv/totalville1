# backend/init_db.py
from app import get_db_connection

def setup_database():
    conn = get_db_connection()
    if not conn:
        print("Não foi possível conectar ao banco para a configuração.")
        return

    cursor = conn.cursor()
    
    try:
        print("Verificando/Criando tabela 'users'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
        """)
        
        print("Verificando/Criando tabela 'visitors'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS visitors (
            id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL,
            cpf VARCHAR(14) NOT NULL UNIQUE, release_date DATE NOT NULL,
            has_car BOOLEAN DEFAULT FALSE, car_plate VARCHAR(10) NULL,
            car_model VARCHAR(50) NULL, car_color VARCHAR(30) NULL,
            resident_apartment VARCHAR(20) NOT NULL, observations TEXT NULL,
            registered_by_user_id INT,
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (registered_by_user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB;
        """)

        print("Verificando/Criando tabela 'occurrences'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS occurrences (
            id INT AUTO_INCREMENT PRIMARY KEY,
            occurrence_type VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            location VARCHAR(255),
            occurrence_date DATETIME NOT NULL,
            status VARCHAR(50) DEFAULT 'Aberto',
            reported_by_user_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (reported_by_user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB;
        """)

        print("Verificando/Criando tabela 'reservations'...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reservations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            space_name VARCHAR(255) NOT NULL,
            reservation_date DATE NOT NULL,
            status VARCHAR(50) DEFAULT 'Pendente',
            reserved_by_user_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (reserved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE KEY unique_space_date (space_name, reservation_date)
        ) ENGINE=InnoDB;
        """)

        conn.commit()
        print("\nConfiguração do banco de dados concluída com sucesso.")

    except Exception as e:
        print(f"Erro durante a configuração do banco: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
        print("Conexão com o MySQL foi fechada.")


if __name__ == '__main__':
    setup_database()