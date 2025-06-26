# Usa uma imagem base oficial do Python
FROM python:3.10-slim-bookworm

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia o arquivo de requisitos para o diretório de trabalho

RUN apt update && apt install -y \
    build-essential \
    pkg-config \
    libmariadb-dev-compat \
    default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*
# É importante copiar primeiro apenas o requirements.txt para aproveitar o cache do Docker
COPY requirements.txt .

# Instala as dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o restante do código da sua aplicação Python para o diretório de trabalho
COPY . .

# Expõe a porta em que a aplicação Python irá rodar (ajuste se seu app roda em outra porta)
EXPOSE 5000

# Define o comando para rodar a aplicação quando o contêiner iniciar
# Este comando pode variar dependendo do seu framework (Flask, Django, etc.)
# Se for Flask e você tiver um 'app.py' na raiz do seu backend:
CMD ["python", "app.py"]
