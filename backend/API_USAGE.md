# RevPRISMA API - Guia de Uso

## Iniciando a API

### Método 1: Script de inicialização (recomendado)
```bash
chmod +x start.sh
./start.sh
```

### Método 2: Docker
```bash
docker-compose up --build
```

### Método 3: Manual
```bash
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints Principais

### 1. Busca de Artigos
**POST** `/api/search`

```json
{
  "project_name": "Revisão IA em Educação",
  "databases": ["pubmed", "scopus"],
  "queries": {
    "pubmed": "(\"artificial intelligence\"[Title/Abstract]) AND education[Title/Abstract]",
    "scopus": "TITLE-ABS-KEY(\"artificial intelligence\" AND education)"
  },
  "date_start": "2019-01-01",
  "date_end": "2025-08-31",
  "filters_language": ["English"],
  "email": "seu@email.com",
  "api_keys": {
    "scopus": "sua_chave_scopus",
    "wos": "sua_chave_wos"
  }
}
```

**Resposta:**
```json
{
  "project_id": "project_12345",
  "total_records": 1250,
  "records_by_database": {
    "pubmed": 800,
    "scopus": 450
  },
  "records": [...],
  "message": "Encontrados 1250 artigos"
}
```

### 2. Deduplicação
**POST** `/api/deduplicate/{project_id}`

Query params: `fuzzy_threshold=95`

### 3. Triagem Simples
**POST** `/api/screen-simple/{project_id}`

```json
{
  "records": [...],
  "include_keywords": ["education", "school", "learning"],
  "exclude_keywords": ["animal study", "veterinary"],
  "include_logic": "any",
  "exclude_logic": "any"
}
```

### 4. Triagem ML
**POST** `/api/screen-ml/{project_id}`

```json
{
  "records": [...],
  "labels_data": [
    {"record_id": "pmid:12345", "label": 1},
    {"record_id": "pmid:67890", "label": 0}
  ],
  "threshold": 0.65
}
```

### 5. Métricas
**GET** `/api/metrics/{project_id}`

### 6. PRISMA
**POST** `/api/prisma/{project_id}`

```json
{
  "records_counts": {
    "identified_total": 1250,
    "duplicates_removed": 200,
    "records_screened": 1050,
    "records_excluded": 900,
    "studies_included": 150
  },
  "custom_inputs": {
    "reports_not_retrieved": 5,
    "reports_excluded_reasons": {
      "Wrong population": 300,
      "Not peer-reviewed": 400,
      "Other": 200
    }
  }
}
```

### 7. Exportação
**GET** `/api/export/{project_id}?format=excel`

### 8. Status do Projeto
**GET** `/api/projects/{project_id}/status`

### 9. Listar Projetos
**GET** `/api/projects`

## Fluxo Típico de Uso

1. **Buscar artigos**: `POST /api/search`
2. **Remover duplicatas**: `POST /api/deduplicate/{project_id}`
3. **Fazer triagem**: `POST /api/screen-simple/{project_id}` ou `POST /api/screen-ml/{project_id}`
4. **Calcular métricas**: `GET /api/metrics/{project_id}`
5. **Gerar PRISMA**: `POST /api/prisma/{project_id}`
6. **Exportar resultados**: `GET /api/export/{project_id}`

## Configuração de API Keys

### Scopus
1. Registre-se em: https://dev.elsevier.com/
2. Obtenha sua API key
3. Configure: `SCOPUS_API_KEY=sua_chave`

### Web of Science
1. Registre-se em: https://developer.clarivate.com/
2. Obtenha sua API key  
3. Configure: `WOS_API_KEY=sua_chave`

### PubMed
- Email é obrigatório
- API key é opcional mas recomendada

## Documentação Interativa

Após iniciar a API, acesse:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Exemplo com cURL

```bash
# Buscar artigos
curl -X POST "http://localhost:8000/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "Teste API",
    "databases": ["pubmed"],
    "queries": {"pubmed": "machine learning[Title]"},
    "email": "teste@email.com"
  }'

# Obter status
curl "http://localhost:8000/api/projects/{project_id}/status"
```