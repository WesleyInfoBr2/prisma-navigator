#!/usr/bin/env python3

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import tempfile
import shutil
from pathlib import Path
import pandas as pd
import json

# Import existing sysrev_tool functions
from sysrev_tool import (
    Config, search_pubmed, search_scopus, search_wos,
    df_standardize, deduplicate, screen_simple, screen_ml,
    compute_metrics, save_prisma_complete, save_excel, ensure_dir
)

app = FastAPI(
    title="RevPRISMA API",
    description="API para Revisão Sistemática automatizada com PRISMA 2020",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure according to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class SearchRequest(BaseModel):
    project_name: str
    databases: List[str]
    queries: Dict[str, str]
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    filters_language: List[str] = []
    filters_pub_types_exclude: List[str] = []
    email: Optional[str] = None
    api_keys: Dict[str, str] = {}

class ScreeningRequest(BaseModel):
    records: List[Dict[str, Any]]
    include_keywords: List[str]
    exclude_keywords: List[str]
    include_logic: str = "any"
    exclude_logic: str = "any"

class MLScreeningRequest(BaseModel):
    records: List[Dict[str, Any]]
    labels_data: List[Dict[str, Any]]  # [{"record_id": "id", "label": 1}, ...]
    threshold: float = 0.5

class PrismaRequest(BaseModel):
    records_counts: Dict[str, int]
    custom_inputs: Optional[Dict[str, Any]] = None

# Global storage for project data (in production, use database)
projects_data = {}

@app.get("/")
async def root():
    return {"message": "RevPRISMA API v2.0.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}

@app.post("/api/search")
async def search_articles(request: SearchRequest):
    """Executa busca automática em bases científicas"""
    try:
        project_id = f"project_{hash(request.project_name)}_{len(projects_data)}"
        
        # Create temporary config
        config_data = {
            "project_name": request.project_name,
            "databases": request.databases,
            "queries": request.queries,
            "date_range": {
                "start": request.date_start,
                "end": request.date_end
            },
            "filters": {
                "language": request.filters_language,
                "pub_types_exclude": request.filters_pub_types_exclude
            }
        }
        
        all_records = []
        results_by_database = {}
        
        # Search each database
        for db in request.databases:
            records = []
            
            if db == "pubmed" and "pubmed" in request.queries:
                email = request.email or "user@example.com"
                api_key = request.api_keys.get("pubmed")
                records = search_pubmed(
                    request.queries["pubmed"], 
                    request.date_start, 
                    request.date_end, 
                    email, 
                    api_key
                )
            
            elif db == "scopus" and "scopus" in request.queries:
                records = search_scopus(request.queries["scopus"])
            
            elif db == "wos" and "wos" in request.queries:
                api_key = request.api_keys.get("wos")
                records = search_wos(request.queries["wos"], api_key=api_key)
            
            results_by_database[db] = len(records)
            all_records.extend(records)
        
        # Store project data
        projects_data[project_id] = {
            "config": config_data,
            "raw_records": all_records,
            "search_results": results_by_database
        }
        
        return {
            "project_id": project_id,
            "total_records": len(all_records),
            "records_by_database": results_by_database,
            "records": all_records[:100] if len(all_records) > 100 else all_records,  # Return first 100 for preview
            "message": f"Encontrados {len(all_records)} artigos"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na busca: {str(e)}")

@app.post("/api/deduplicate/{project_id}")
async def deduplicate_articles(project_id: str, fuzzy_threshold: int = 95):
    """Remove duplicatas dos artigos"""
    try:
        if project_id not in projects_data:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        
        records = projects_data[project_id]["raw_records"]
        
        # Apply deduplication
        deduplicated = deduplicate_records(records, fuzzy_threshold)
        
        # Update project data
        projects_data[project_id]["deduplicated_records"] = deduplicated
        projects_data[project_id]["dedup_stats"] = {
            "original_count": len(records),
            "deduplicated_count": len(deduplicated),
            "duplicates_removed": len(records) - len(deduplicated)
        }
        
        return {
            "original_count": len(records),
            "deduplicated_count": len(deduplicated),
            "duplicates_removed": len(records) - len(deduplicated),
            "records": deduplicated[:100] if len(deduplicated) > 100 else deduplicated
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na deduplicação: {str(e)}")

@app.post("/api/screen-simple/{project_id}")
async def screen_simple(project_id: str, screening: ScreeningRequest):
    """Triagem simples baseada em palavras-chave"""
    try:
        if project_id not in projects_data:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        
        records = projects_data[project_id].get("deduplicated_records") or projects_data[project_id]["raw_records"]
        
        screened = screen_records_simple(
            records,
            screening.include_keywords,
            screening.exclude_keywords,
            screening.include_logic,
            screening.exclude_logic
        )
        
        # Update project data
        projects_data[project_id]["screened_records"] = screened
        projects_data[project_id]["screening_stats"] = {
            "total_screened": len(records),
            "included": len([r for r in screened if r.get("screening_decision") == "include"]),
            "excluded": len([r for r in screened if r.get("screening_decision") == "exclude"])
        }
        
        included = [r for r in screened if r.get("screening_decision") == "include"]
        
        return {
            "total_screened": len(records),
            "included_count": len(included),
            "excluded_count": len(records) - len(included),
            "included_records": included[:50] if len(included) > 50 else included
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na triagem: {str(e)}")

@app.post("/api/screen-ml/{project_id}")
async def screen_ml(project_id: str, ml_request: MLScreeningRequest):
    """Triagem avançada com Machine Learning"""
    try:
        if project_id not in projects_data:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        
        records = projects_data[project_id].get("deduplicated_records") or projects_data[project_id]["raw_records"]
        
        # Convert labels data to DataFrame
        labels_df = pd.DataFrame(ml_request.labels_data)
        
        screened = screen_records_ml(records, labels_df, ml_request.threshold)
        
        # Update project data
        projects_data[project_id]["screened_records"] = screened
        projects_data[project_id]["ml_model_stats"] = {
            "threshold": ml_request.threshold,
            "training_samples": len(ml_request.labels_data)
        }
        
        included = [r for r in screened if r.get("screening_decision") == "include"]
        
        return {
            "total_screened": len(records),
            "included_count": len(included),
            "excluded_count": len(records) - len(included),
            "threshold_used": ml_request.threshold,
            "included_records": included[:50] if len(included) > 50 else included
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na triagem ML: {str(e)}")

@app.get("/api/metrics/{project_id}")
async def get_metrics(project_id: str, labels_file_data: Optional[List[Dict]] = None):
    """Calcula métricas de qualidade da triagem"""
    try:
        if project_id not in projects_data:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        
        screened_records = projects_data[project_id].get("screened_records", [])
        
        if not screened_records:
            raise HTTPException(status_code=400, detail="Nenhum registro triado encontrado")
        
        # If no labels provided, return basic stats
        if not labels_file_data:
            included = len([r for r in screened_records if r.get("screening_decision") == "include"])
            excluded = len([r for r in screened_records if r.get("screening_decision") == "exclude"])
            
            return {
                "basic_stats": {
                    "total_screened": len(screened_records),
                    "included": included,
                    "excluded": excluded,
                    "inclusion_rate": included / len(screened_records) if screened_records else 0
                }
            }
        
        # Calculate full metrics with labels
        labels_df = pd.DataFrame(labels_file_data)
        metrics = calculate_metrics(screened_records, labels_df)
        
        return {"metrics": metrics}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no cálculo de métricas: {str(e)}")

@app.post("/api/prisma/{project_id}")
async def generate_prisma(project_id: str, prisma_request: Optional[PrismaRequest] = None):
    """Gera diagrama PRISMA 2020"""
    try:
        if project_id not in projects_data:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        
        project_data = projects_data[project_id]
        
        # Get counts from project data or request
        if prisma_request and prisma_request.records_counts:
            counts = prisma_request.records_counts
        else:
            # Auto-calculate from project data
            raw_count = len(project_data.get("raw_records", []))
            dedup_count = len(project_data.get("deduplicated_records", []))
            screened = project_data.get("screened_records", [])
            included = len([r for r in screened if r.get("screening_decision") == "include"])
            
            counts = {
                "identified_total": raw_count,
                "duplicates_removed": raw_count - dedup_count,
                "records_screened": dedup_count,
                "records_excluded": dedup_count - included,
                "studies_included": included
            }
        
        # Create temporary output directory
        temp_dir = tempfile.mkdtemp()
        output_path = Path(temp_dir) / "prisma_diagram.png"
        
        # Generate PRISMA diagram
        create_prisma_diagram(counts, str(output_path), prisma_request.custom_inputs if prisma_request else None)
        
        return {
            "counts": counts,
            "diagram_generated": True,
            "download_url": f"/api/download/prisma/{project_id}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na geração do PRISMA: {str(e)}")

@app.get("/api/export/{project_id}")
async def export_results(project_id: str, format: str = "excel"):
    """Exporta resultados em Excel ou CSV"""
    try:
        if project_id not in projects_data:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        
        project_data = projects_data[project_id]
        
        # Create temporary file
        temp_dir = tempfile.mkdtemp()
        
        if format.lower() == "excel":
            filename = f"{project_data['config']['project_name']}_results.xlsx"
            filepath = Path(temp_dir) / filename
            
            # Prepare DataFrames
            dfs = {}
            
            if "raw_records" in project_data:
                dfs["Raw_Data"] = pd.DataFrame(project_data["raw_records"])
            
            if "deduplicated_records" in project_data:
                dfs["Deduplicated"] = pd.DataFrame(project_data["deduplicated_records"])
            
            if "screened_records" in project_data:
                dfs["Screened"] = pd.DataFrame(project_data["screened_records"])
                
                # Separate included/excluded
                screened_df = pd.DataFrame(project_data["screened_records"])
                if not screened_df.empty:
                    included_df = screened_df[screened_df["screening_decision"] == "include"]
                    excluded_df = screened_df[screened_df["screening_decision"] == "exclude"]
                    
                    if not included_df.empty:
                        dfs["Included"] = included_df
                    if not excluded_df.empty:
                        dfs["Excluded"] = excluded_df
            
            save_excel(dfs, str(filepath))
            
            return FileResponse(
                filepath,
                filename=filename,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        
        else:
            raise HTTPException(status_code=400, detail="Formato não suportado")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na exportação: {str(e)}")

@app.get("/api/projects/{project_id}/status")
async def get_project_status(project_id: str):
    """Retorna status do projeto"""
    try:
        if project_id not in projects_data:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        
        project = projects_data[project_id]
        
        status = {
            "project_id": project_id,
            "project_name": project["config"]["project_name"],
            "has_raw_data": "raw_records" in project,
            "has_deduplicated": "deduplicated_records" in project,
            "has_screened": "screened_records" in project,
            "raw_count": len(project.get("raw_records", [])),
            "dedup_count": len(project.get("deduplicated_records", [])),
            "screened_count": len(project.get("screened_records", []))
        }
        
        if "screened_records" in project:
            screened = project["screened_records"]
            status["included_count"] = len([r for r in screened if r.get("screening_decision") == "include"])
            status["excluded_count"] = len([r for r in screened if r.get("screening_decision") == "exclude"])
        
        return status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter status: {str(e)}")

@app.get("/api/projects")
async def list_projects():
    """Lista todos os projetos"""
    projects = []
    for project_id, data in projects_data.items():
        projects.append({
            "project_id": project_id,
            "project_name": data["config"]["project_name"],
            "created_at": data.get("created_at", "unknown"),
            "status": "active" if "screened_records" in data else "in_progress"
        })
    
    return {"projects": projects}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
