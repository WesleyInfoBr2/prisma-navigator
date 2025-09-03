#!/bin/bash

echo "🚀 Iniciando RevPRISMA API..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Criando ambiente virtual..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Ativando ambiente virtual..."
source venv/bin/activate

# Install dependencies
echo "📚 Instalando dependências..."
pip install -r requirements.txt

# Create output directories
mkdir -p outputs
mkdir -p temp

# Start the API
echo "🌐 Iniciando servidor na porta 8000..."
echo "📖 Documentação disponível em: http://localhost:8000/docs"
echo "🎯 API disponível em: http://localhost:8000"

uvicorn api:app --host 0.0.0.0 --port 8000 --reload