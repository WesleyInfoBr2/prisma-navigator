
import os, re, json, time, hashlib, argparse, textwrap, datetime, math, warnings
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple
import yaml
import pandas as pd
import numpy as np
from dateutil import parser as dtparser
from rapidfuzz import fuzz
import matplotlib.pyplot as plt
from Bio import Entrez
try:
    from pybliometrics.scopus import ScopusSearch
    HAVE_SCOPUS = True
except Exception:
    HAVE_SCOPUS = False
import requests
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
warnings.simplefilter("ignore")

def now_iso():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

def norm_text(s: str) -> str:
    if not isinstance(s, str): return ""
    s = s.strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s

def make_record_id(rec: Dict[str, Any]) -> str:
    for key in ["doi", "pmid", "eid", "wos_uid"]:
        v = rec.get(key)
        if isinstance(v, str) and v.strip():
            return f"{key}:{v.strip()}"
    title = norm_text(rec.get("title", "")) or now_iso()+json.dumps(rec, sort_keys=True)[:64]
    return "titlehash:" + hashlib.sha1(title.encode("utf-8")).hexdigest()[:16]

def safe_list(x):
    if x is None: return []
    if isinstance(x, list): return x
    return [x]

def ensure_dir(path: str): os.makedirs(path, exist_ok=True)

def load_yaml(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f: return yaml.safe_load(f)

def save_csv(df: pd.DataFrame, path: str): df.to_csv(path, index=False, encoding="utf-8")

def save_excel(dfs: Dict[str, pd.DataFrame], path: str):
    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        for name, df in dfs.items():
            df.to_excel(writer, sheet_name=name[:31], index=False)

@dataclass
class Config:
    project_name: str
    databases: List[str]
    queries: Dict[str, str]
    date_start: Optional[str]
    date_end: Optional[str]
    filters_language: List[str]
    filters_pub_types_exclude: List[str]
    screening_include_keywords: List[str]
    screening_exclude_keywords: List[str]
    screening_include_logic: str
    screening_exclude_logic: str
    dedup_fuzzy_threshold: int
    export_excel: bool
    export_excel_filename: str
    @staticmethod
    def from_yaml(path: str) -> "Config":
        raw = load_yaml(path)
        date_start = raw.get("date_range", {}).get("start")
        date_end = raw.get("date_range", {}).get("end")
        filters = raw.get("filters", {})
        screening = raw.get("screening", {})
        dedup = raw.get("deduplication", {})
        export = raw.get("export", {})
        return Config(
            project_name=raw.get("project_name", "SysRev Project"),
            databases=raw.get("databases", ["pubmed"]),
            queries=raw.get("queries", {}),
            date_start=date_start, date_end=date_end,
            filters_language=filters.get("language", []),
            filters_pub_types_exclude=filters.get("pub_types_exclude", []),
            screening_include_keywords=screening.get("include_keywords", []),
            screening_exclude_keywords=screening.get("exclude_keywords", []),
            screening_include_logic=screening.get("include_logic", "any"),
            screening_exclude_logic=screening.get("exclude_logic", "any"),
            dedup_fuzzy_threshold=int(dedup.get("fuzzy_threshold", 95)),
            export_excel=bool(export.get("excel", True)),
            export_excel_filename=export.get("excel_filename", "sysrev_export.xlsx"),
        )

def search_pubmed(query: str, date_start: Optional[str], date_end: Optional[str], email: str, api_key: Optional[str]=None, retmax: int=10000) -> List[Dict[str, Any]]:
    try:
        # Validate email format
        if not email or "@" not in email:
            raise ValueError("Email válido é obrigatório para buscar no PubMed")
        
        Entrez.email = email
        if api_key: Entrez.api_key = api_key
        
        # Clean and validate query
        query = query.strip()
        if not query:
            raise ValueError("Query não pode estar vazia")
            
        params = {"db":"pubmed","term":query,"retmode":"json","retmax":retmax}
        if date_start or date_end:
            params.update({"datetype":"pdat"})
            if date_start: params["mindate"] = date_start[:10]
            if date_end: params["maxdate"] = date_end[:10]
            
        # Search for article IDs
        try:
            handle = Entrez.esearch(**params)
            result = Entrez.read(handle)
            handle.close()
        except Exception as e:
            raise ValueError(f"Erro na busca PubMed: {str(e)}")
            
        ids = result.get("IdList", [])
        recs = []
        if not ids: 
            return recs
            
        # Fetch articles in batches
        B = 200
        for i in range(0, len(ids), B):
            chunk = ids[i:i+B]
            try:
                fetch = Entrez.efetch(db="pubmed", id=",".join(chunk), rettype="medline", retmode="xml")
                data = Entrez.read(fetch)
                fetch.close()
            except Exception as e:
                print(f"Erro ao buscar artigos PubMed (batch {i//B + 1}): {str(e)}")
                continue
            for art in data.get("PubmedArticle", []):
                try:
                    artset = art["MedlineCitation"]; pmid = artset.get("PMID",""); article = artset.get("Article", {})
                    title = article.get("ArticleTitle","")
                    abstract = ""
                    if "Abstract" in article and "AbstractText" in article["Abstract"]:
                        abstract = " ".join([str(x) for x in article["Abstract"]["AbstractText"]])
                    journal = article.get("Journal", {}).get("Title", "")
                    year = None
                    try:
                        dp = artset.get("DateCompleted") or artset.get("DateCreated") or {}
                        y = dp.get("Year"); year = int(y) if y else None
                    except Exception: pass
                    authors = []
                    for a in article.get("AuthorList", []):
                        name = " ".join([a.get("ForeName",""), a.get("LastName","")]).strip()
                        if name: authors.append(name)
                    authors_str = "; ".join(authors) if authors else ""
                    doi = ""
                    if "PubmedData" in art and "ArticleIdList" in art["PubmedData"]:
                        for aid in art["PubmedData"]["ArticleIdList"]:
                            if aid.attributes.get("IdType","").lower()=="doi":
                                doi = str(aid)
                    pub_types = [str(x) for x in safe_list(article.get("PublicationTypeList", []))]
                    lang = ""
                    langs = article.get("Language", [])
                    if isinstance(langs, list) and langs: lang = str(langs[0])
                    rec = {"source":"pubmed","title":str(title),"abstract":str(abstract),"authors":authors_str,"journal":str(journal),
                           "year":year,"language":lang,"pub_types":"; ".join(pub_types) if pub_types else "",
                           "doi":doi.strip(),"pmid":str(pmid),"eid":"","wos_uid":"","query":query,"retrieved_at":now_iso()}
                    rec["record_id"] = make_record_id(rec); recs.append(rec)
                except Exception: continue
        return recs
    except Exception as e:
        raise ValueError(f"Erro na busca PubMed: {str(e)}")

def search_scopus(query: str) -> List[Dict[str, Any]]:
    if not HAVE_SCOPUS: return []
    try:
        s = ScopusSearch(query, view="COMPLETE")
        if not s or not s.results: return []
        recs = []
        for r in s.results:
            rec = {"source":"scopus","title":getattr(r,"title","") or "","abstract":getattr(r,"description","") or "",
                   "authors":getattr(r,"author_names","") or "","journal":getattr(r,"publicationName","") or "",
                   "year": int(getattr(r,"coverDate","")[:4]) if getattr(r,"coverDate","") else None,
                   "language":"","pub_types":"","doi": (getattr(r,"doi","") or "").strip(),
                   "pmid":"","eid":getattr(r,"eid","") or "","wos_uid":"",
                   "query":query,"retrieved_at":now_iso()}
            rec["record_id"] = make_record_id(rec); recs.append(rec)
        return recs
    except Exception:
        return []

def search_wos(query: str, base_url: Optional[str]=None, api_key: Optional[str]=None, limit: int=1000) -> List[Dict[str, Any]]:
    api_key = api_key or os.getenv("WOS_API_KEY")
    base_url = base_url or os.getenv("WOS_BASE_URL", "https://api.clarivate.com/api/woslite")
    if not api_key: return []
    headers = {"X-ApiKey": api_key}
    try:
        recs = []; first=1; count=100
        for _ in range(0, limit, count):
            params = {"databaseId":"WOS","usrQuery":query,"count":count,"firstRecord":first}
            resp = requests.get(base_url, headers=headers, params=params, timeout=30)
            if resp.status_code != 200: break
            data = resp.json()
            records = data.get("Data", [{}])[0].get("Records", {}).get("records", [])
            if not records: break
            for r in records:
                title = ""; journal = ""; year = None; doi = ""; wos_uid = r.get("UID","")
                try:
                    static = r.get("static_data", {}); full = static.get("fullrecord_metadata", {})
                    titles = full.get("titles", {}).get("title", [])
                    for t in titles:
                        if t.get("type")=="item": title = t.get("content","")
                    pub_info = full.get("pub_info", {})
                    if "pubyear" in pub_info: year = int(pub_info["pubyear"])
                    journal = full.get("source", {}).get("title", {}).get("content", "")
                    for iden in full.get("identifiers", {}).get("identifier", []):
                        if iden.get("type","").lower()=="doi": doi = iden.get("value","")
                except Exception: pass
                rec = {"source":"wos","title":title,"abstract":"","authors":"","journal":journal,"year":year,"language":"",
                       "pub_types":"","doi":doi,"pmid":"","eid":"","wos_uid":wos_uid,"query":query,"retrieved_at":now_iso()}
                rec["record_id"] = make_record_id(rec); recs.append(rec)
            first += count
        return recs
    except Exception:
        return []

def df_standardize(df: pd.DataFrame) -> pd.DataFrame:
    cols = ["record_id","source","title","abstract","authors","journal","year","language","pub_types","doi","pmid","eid","wos_uid","query","retrieved_at"]
    for c in cols:
        if c not in df.columns: df[c] = ""
    if "year" in df.columns: df["year"] = pd.to_numeric(df["year"], errors="coerce").astype("Int64")
    return df[cols].copy()

def deduplicate(df: pd.DataFrame, fuzzy_threshold: int=95) -> Tuple[pd.DataFrame, int]:
    before = len(df)
    keys = ["doi","pmid","eid","wos_uid"]
    mask_nonempty = df[keys].apply(lambda r: any([isinstance(r[k], str) and r[k].strip() for k in keys]), axis=1)
    if mask_nonempty.any():
        df["__idkey"] = df.apply(lambda r: next((r[k] for k in keys if isinstance(r[k], str) and r[k].strip()), ""), axis=1)
        df = df.drop_duplicates(subset="__idkey", keep="first").drop(columns="__idkey")
    df["__title_norm"] = df["title"].apply(lambda s: re.sub(r"[^a-z0-9 ]","", norm_text(s)))
    df = df.sort_values(["__title_norm","source"])
    to_drop = set(); buckets = {}
    for idx, v in zip(df.index.tolist(), df["__title_norm"].tolist()):
        buckets.setdefault(v[:20], []).append((idx, v))
    for bucket, items in buckets.items():
        for i in range(len(items)):
            idx_i, v_i = items[i]
            if idx_i in to_drop: continue
            for j in range(i+1, len(items)):
                idx_j, v_j = items[j]
                if idx_j in to_drop: continue
                if fuzz.token_set_ratio(v_i, v_j) >= fuzzy_threshold: to_drop.add(idx_j)
    dedup_df = df.drop(index=list(to_drop)).drop(columns="__title_norm")
    return dedup_df, before - len(dedup_df)

def keyword_match(text: str, keywords: List[str], logic: str) -> bool:
    if not keywords: return False
    t = norm_text(text); hits = [kw.lower() in t for kw in keywords]
    return all(hits) if logic=="all" else any(hits)

def screen_simple(df: pd.DataFrame, include_kw: List[str], exclude_kw: List[str], inc_logic: str="any", exc_logic: str="any") -> pd.DataFrame:
    inc_title = df["title"].fillna("").apply(lambda t: keyword_match(t, include_kw, inc_logic))
    inc_abs = df["abstract"].fillna("").apply(lambda a: keyword_match(a, include_kw, inc_logic))
    inc = (inc_title | inc_abs) if include_kw else pd.Series([True]*len(df), index=df.index)
    exc_title = df["title"].fillna("").apply(lambda t: keyword_match(t, exclude_kw, exc_logic)) if exclude_kw else pd.Series([False]*len(df), index=df.index)
    exc_abs = df["abstract"].fillna("").apply(lambda a: keyword_match(a, exclude_kw, exc_logic)) if exclude_kw else pd.Series([False]*len(df), index=df.index)
    exc = exc_title | exc_abs
    out = df.copy()
    out["screen_mode"] = "simple"
    out["screen_include_hit"] = inc.astype(bool)
    out["screen_exclude_hit"] = exc.astype(bool)
    out["screen_score"] = np.where(inc, 1.0, 0.0)
    out["screen_relevant"] = out["screen_include_hit"] & (~out["screen_exclude_hit"])
    return out

def build_ml_pipeline() -> Pipeline:
    return Pipeline([("tfidf", TfidfVectorizer(max_features=60000, ngram_range=(1,2))),
                     ("clf", LogisticRegression(max_iter=200, class_weight="balanced", solver="liblinear"))])

def train_ml(outdir: str, labels_csv: str, results_csv: Optional[str]=None) -> Dict[str, Any]:
    cand = [os.path.join(outdir,"results_screened.csv"), os.path.join(outdir,"results_dedup.csv"), os.path.join(outdir,"results_raw.csv")]
    base = None
    for p in cand:
        if os.path.exists(p): base = pd.read_csv(p); break
    if results_csv and base is None and os.path.exists(results_csv): base = pd.read_csv(results_csv)
    if base is None or base.empty: raise RuntimeError("Não encontrei resultados. Rode 'search' e 'dedup' primeiro.")
    labels = pd.read_csv(labels_csv)
    m = base.merge(labels[["record_id","label"]], on="record_id", how="inner")
    if m.empty: raise RuntimeError("Sem interseção entre resultados e labels. Verifique 'record_id'.")
    X = (m["title"].fillna("") + " " + m["abstract"].fillna("")).astype(str); y = m["label"].astype(int).values
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    pipe = build_ml_pipeline(); pipe.fit(Xtr, ytr)
    ypred = pipe.predict(Xte); report = classification_report(yte, ypred, output_dict=True)
    model_path = os.path.join(outdir, "model_ml.joblib"); joblib.dump(pipe, model_path)
    return {"model_path": model_path, "report": report, "n_train": len(Xtr), "n_test": len(Xte)}

def screen_ml(df: pd.DataFrame, model_path: str, threshold: float=0.5) -> pd.DataFrame:
    if not os.path.exists(model_path): raise RuntimeError(f"Modelo não encontrado: {model_path}. Rode 'train-ml'.")
    pipe: Pipeline = joblib.load(model_path)
    X = (df["title"].fillna("") + " " + df["abstract"].fillna("")).astype(str)
    probs = pipe.predict_proba(X)[:,1]
    out = df.copy()
    out["screen_mode"] = "ml"
    out["screen_score"] = probs
    out["screen_relevant"] = probs >= float(threshold)
    out["screen_include_hit"] = out["screen_relevant"]
    out["screen_exclude_hit"] = False
    return out

def compute_metrics(screen_df: pd.DataFrame, labels_df: pd.DataFrame) -> Dict[str, Any]:
    m = screen_df.merge(labels_df[["record_id","label"]], on="record_id", how="inner")
    if m.empty: return {"note":"Sem interseção entre resultados e labels."}
    y_true = m["label"].astype(int).values; y_pred = m["screen_relevant"].astype(int).values
    tp = int(((y_true==1)&(y_pred==1)).sum()); fp = int(((y_true==0)&(y_pred==1)).sum())
    fn = int(((y_true==1)&(y_pred==0)).sum()); tn = int(((y_true==0)&(y_pred==0)).sum())
    precision = tp/(tp+fp) if (tp+fp)>0 else 0.0; recall = tp/(tp+fn) if (tp+fn)>0 else 0.0
    f1 = (2*precision*recall)/(precision+recall) if (precision+recall)>0 else 0.0
    nnr = (1/precision) if precision>0 else None
    return {"tp":tp,"fp":fp,"fn":fn,"tn":tn,"precision":precision,"recall":recall,"f1":f1,"nnr":nnr}

def save_prisma_complete(counts: Dict[str,int], reasons: Dict[str,int], outpath: str):
    id_db = counts.get("identified_databases", 0)
    id_reg = counts.get("identified_registers", 0)
    rm_dup = counts.get("removed_duplicates", 0)
    rm_auto = counts.get("removed_automatic", 0)
    rm_other = counts.get("removed_other", 0)
    rec_screened = counts.get("records_screened", 0)
    rec_excluded = counts.get("records_excluded", 0)
    rep_sought = counts.get("reports_sought", max(0, rec_screened - rec_excluded))
    rep_not_ret = counts.get("reports_not_retrieved", 0)
    rep_assessed = counts.get("reports_assessed", max(0, rep_sought - rep_not_ret))
    studies_inc = counts.get("studies_included", rep_assessed)
    studies_meta = counts.get("studies_included_meta", 0)
    plt.figure(figsize=(10,12)); ax = plt.gca(); ax.axis("off")
    def box(x,y,w,h,text):
        rect = plt.Rectangle((x-w/2,y-h/2), w,h, fill=False); ax.add_patch(rect); ax.text(x,y,text,ha="center",va="center",wrap=True)
    def arrow(x1,y1,x2,y2): ax.annotate("", xy=(x2,y2), xytext=(x1,y1), arrowprops=dict(arrowstyle="->"))
    W,H = 0.58,0.08
    box(0.3,0.92,W,H, f"Registros identificados:\nBases de dados: {id_db}")
    box(0.7,0.92,W,H, f"Registros identificados:\nRegistros (cadastros): {id_reg}")
    box(0.5,0.80,W,H, f"Registros removidos antes da triagem:\nDuplicatas: {rm_dup}\nIneligíveis por automação: {rm_auto}\nOutros: {rm_other}")
    arrow(0.3,0.88,0.5,0.84); arrow(0.7,0.88,0.5,0.84)
    box(0.5,0.66,W,H, f"Registros após remoções (triagem): {rec_screened}")
    arrow(0.5,0.76,0.5,0.70)
    box(0.5,0.54,W,H, f"Registros excluídos: {rec_excluded}")
    arrow(0.5,0.62,0.5,0.58)
    box(0.5,0.42,W,H, f"Relatórios buscados para recuperação: {rep_sought}\nNão recuperados: {rep_not_ret}")
    arrow(0.5,0.50,0.5,0.46)
    box(0.5,0.30,W,H, f"Relatórios avaliados para elegibilidade: {rep_assessed}")
    arrow(0.5,0.38,0.5,0.34)
    reasons_txt = "\n".join([f"{k}: {v}" for k,v in reasons.items() if v]) or "—"
    box(0.8,0.30,W,H, f"Relatórios excluídos, com motivos:\n{reasons_txt}")
    arrow(0.74,0.30,0.59,0.30)
    meta_line = f"\\nIncluídos em meta‑análise: {studies_meta}" if studies_meta else ""
    box(0.5,0.18,W,H, f"Estudos incluídos na revisão: {studies_inc}{meta_line}")
    arrow(0.5,0.26,0.5,0.22)
    plt.tight_layout(); plt.savefig(outpath, dpi=200, bbox_inches="tight"); plt.close()

def infer_prisma_counts(outdir: str) -> Dict[str,int]:
    p_raw = os.path.join(outdir,"results_raw.csv"); p_dedup = os.path.join(outdir,"results_dedup.csv"); p_scr = os.path.join(outdir,"results_screened.csv")
    df_raw = pd.read_csv(p_raw) if os.path.exists(p_raw) else pd.DataFrame()
    df_dedup = pd.read_csv(p_dedup) if os.path.exists(p_dedup) else pd.DataFrame()
    df_scr = pd.read_csv(p_scr) if os.path.exists(p_scr) else pd.DataFrame()
    identified = len(df_raw); after_dedup = len(df_dedup); rm_dup = max(identified - after_dedup, 0)
    rec_screened = after_dedup
    rec_excluded = int((~df_scr["screen_relevant"]).sum()) if not df_scr.empty and "screen_relevant" in df_scr.columns else 0
    studies_inc = int(df_scr["screen_relevant"].sum()) if not df_scr.empty and "screen_relevant" in df_scr.columns else 0
    return {"identified_databases": identified, "identified_registers": 0, "removed_duplicates": rm_dup, "removed_automatic": 0, "removed_other": 0,
            "records_screened": rec_screened, "records_excluded": rec_excluded, "reports_sought": studies_inc, "reports_not_retrieved":0,
            "reports_assessed": studies_inc, "studies_included": studies_inc, "studies_included_meta": 0}

def read_results(path: str) -> pd.DataFrame:
    p = os.path.join(path,"results_raw.csv"); return pd.read_csv(p) if os.path.exists(p) else pd.DataFrame()
def read_dedup(path: str) -> pd.DataFrame:
    p = os.path.join(path,"results_dedup.csv"); return pd.read_csv(p) if os.path.exists(p) else pd.DataFrame()
def read_screened(path: str) -> pd.DataFrame:
    p = os.path.join(path,"results_screened.csv"); return pd.read_csv(p) if os.path.exists(p) else pd.DataFrame()

def action_search(cfg: Config, outdir: str):
    ensure_dir(outdir); all_recs = []
    if "pubmed" in [d.lower() for d in cfg.databases]:
        email = os.getenv("ENTREZ_EMAIL","")
        if not email: raise RuntimeError("ENTREZ_EMAIL não definido.")
        print("[*] Buscando PubMed..."); all_recs.extend(search_pubmed(cfg.queries.get("pubmed",""), cfg.date_start, cfg.date_end, email, os.getenv("ENTREZ_API_KEY")))
    if "scopus" in [d.lower() for d in cfg.databases]:
        if not HAVE_SCOPUS: print("[!] pybliometrics não instalado/configurado. Pulando Scopus.")
        else: print("[*] Buscando Scopus..."); all_recs.extend(search_scopus(cfg.queries.get("scopus","")))
    if "wos" in [d.lower() for d in cfg.databases]:
        print("[*] Buscando Web of Science...]"); all_recs.extend(search_wos(cfg.queries.get("wos","")))
    if not all_recs: print("[!] Nenhum registro recuperado."); return
    df = df_standardize(pd.DataFrame(all_recs)); save_csv(df, os.path.join(outdir,"results_raw.csv"))
    print(f"[OK] Salvo: results_raw.csv ({len(df)} registros)")

def action_dedup(cfg: Config, outdir: str):
    ensure_dir(outdir); df = read_results(outdir)
    if df.empty: print("[!] Rode 'search' primeiro."); return
    dd, removed = deduplicate(df, cfg.dedup_fuzzy_threshold); save_csv(dd, os.path.join(outdir,"results_dedup.csv"))
    with open(os.path.join(outdir,"dedup_stats.json"),"w",encoding="utf-8") as f:
        json.dump({"before":len(df),"duplicates_removed":removed,"after":len(dd)}, f, ensure_ascii=False, indent=2)
    print(f"[OK] Deduplicado: removidos {removed}. Restantes: {len(dd)}")

def action_screen(cfg: Config, outdir: str, mode: str="simple", threshold: float=0.5):
    ensure_dir(outdir); df = read_dedup(outdir)
    if df.empty: print("[!] Rode 'dedup' primeiro."); return
    if cfg.filters_language: df = df[df["language"].fillna("").isin(cfg.filters_language)]
    if cfg.filters_pub_types_exclude:
        mask = df["pub_types"].fillna(""); excl = "|".join([re.escape(x) for x in cfg.filters_pub_types_exclude])
        df = df[~mask.str.contains(excl, case=False, na=False)]
    if mode=="ml":
        scr = screen_ml(df, model_path=os.path.join(outdir,"model_ml.joblib"), threshold=threshold)
    else:
        scr = screen_simple(df, cfg.screening_include_keywords, cfg.screening_exclude_keywords, cfg.screening_include_logic, cfg.screening_exclude_logic)
    save_csv(scr, os.path.join(outdir,"results_screened.csv"))
    if cfg.export_excel:
        save_excel({"raw": read_results(outdir), "dedup": df, "screened": scr}, os.path.join(outdir, cfg.export_excel_filename))
    print(f"[OK] Triagem ({mode}) concluída. Relevantes: {int(scr['screen_relevant'].sum())} / {len(scr)}")

def action_metrics(outdir: str):
    ensure_dir(outdir); scr = read_screened(outdir)
    if scr.empty: print("[!] Rode 'screen' primeiro."); return
    labels_path = os.path.join(outdir,"labels.csv")
    if not os.path.exists(labels_path): print("[!] labels.csv não encontrado (record_id,label)."); return
    labels = pd.read_csv(labels_path); m = compute_metrics(scr, labels)
    with open(os.path.join(outdir,"metrics.json"),"w",encoding="utf-8") as f: json.dump(m,f,ensure_ascii=False,indent=2)
    print("[OK] Métricas:", m)

def action_train_ml(outdir: str, labels_csv: str, results_csv: Optional[str]=None):
    ensure_dir(outdir); info = train_ml(outdir, labels_csv, results_csv)
    with open(os.path.join(outdir,"ml_report.json"),"w",encoding="utf-8") as f: json.dump(info,f,ensure_ascii=False,indent=2)
    print(f"[OK] Modelo treinado em: {info['model_path']}"); print(json.dumps(info["report"], indent=2))

def action_prisma(outdir: str, prisma_yaml: Optional[str]=None):
    ensure_dir(outdir); counts = infer_prisma_counts(outdir); reasons = {}
    if prisma_yaml and os.path.exists(prisma_yaml):
        y = load_yaml(prisma_yaml) or {}
        reasons = y.pop("reports_excluded_reasons", {}) or {}
        for k,v in y.items():
            if v is not None: counts[k] = v
    ensure_dir(os.path.join(outdir,"plots"))
    prisma_path = os.path.join(outdir,"plots","prisma_complete.png")
    save_prisma_complete(counts, reasons, prisma_path)
    with open(os.path.join(outdir,"prisma_counts.json"),"w",encoding="utf-8") as f:
        json.dump({"counts":counts,"reasons":reasons}, f, ensure_ascii=False, indent=2)
    print(f"[OK] PRISMA completo salvo em: {prisma_path}")

def action_all(cfg: Config, outdir: str):
    action_search(cfg, outdir); action_dedup(cfg, outdir); action_screen(cfg, outdir, mode="simple"); action_prisma(outdir)

def main():
    ap = argparse.ArgumentParser(description="SysRev Tool v2 — PRISMA 2020 + Triagem Simple/ML",
                                 formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    ap.add_argument("--config", type=str, help="Arquivo YAML com queries e parâmetros")
    ap.add_argument("--outdir", type=str, default="results", help="Diretório de saída")

    sub.add_parser("search", help="Busca (PubMed + opcionais) -> results_raw.csv")
    sub.add_parser("dedup", help="Dedup -> results_dedup.csv")

    sp_screen = sub.add_parser("screen", help="Triagem simple (palavras) ou ml (modelo) -> results_screened.csv")
    sp_screen.add_argument("--mode", choices=["simple","ml"], default="simple")
    sp_screen.add_argument("--threshold", type=float, default=0.5)

    sub.add_parser("metrics", help="Métricas a partir de labels.csv")

    sp_train = sub.add_parser("train-ml", help="Treina modelo ML usando labels.csv")
    sp_train.add_argument("--labels", required=True)
    sp_train.add_argument("--results-csv", required=False)

    sp_prisma = sub.add_parser("prisma", help="Gera PRISMA 2020 completo")
    sp_prisma.add_argument("--prisma-yaml", required=False)

    sub.add_parser("all", help="Pipeline completo: search -> dedup -> screen(simple) -> prisma")

    args = ap.parse_args(); outdir = args.outdir; ensure_dir(outdir)
    if args.cmd in ["search","screen","all","dedup"]:
        if not args.config: raise RuntimeError("--config é obrigatório para 'search', 'screen', 'dedup' e 'all'")
        cfg = Config.from_yaml(args.config)
    else:
        cfg = None
    if args.cmd=="search": action_search(cfg, outdir)
    elif args.cmd=="dedup": action_dedup(cfg, outdir)
    elif args.cmd=="screen": action_screen(cfg, outdir, mode=args.mode, threshold=args.threshold)
    elif args.cmd=="metrics": action_metrics(outdir)
    elif args.cmd=="train-ml": action_train_ml(outdir, labels_csv=args.labels, results_csv=args.results_csv)
    elif args.cmd=="prisma": action_prisma(outdir, prisma_yaml=args.prisma_yaml)
    elif args.cmd=="all": action_all(cfg, outdir)

if __name__=="__main__":
    main()
