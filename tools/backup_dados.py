"""Backup dos dados de adesão e de uso (somente leitura no banco; grava arquivos JSON/CSV numa pasta com data e hora).

Guarda: uso diário (students/*/usage), cadastro (só campos úteis, sem e-mail, foto, tokens nem cobrança), pós-aulas (sem o HTML),
atividades (progresso, conclusão e resumo da correção), atividades extras, Desafio (rodadas e envios), o retrato semanal da nota
(schools/*/adesaoSemanal), a configuração da adesão e o relatório de leitura dos pós-aulas.
As respostas escritas dos alunos só entram com --respostas.

Uso:  python tools/backup_dados.py [--saida PASTA] [--respostas]
Credencial: variável GOOGLE_APPLICATION_CREDENTIALS (service account). Nunca versionar o arquivo da chave nem a pasta do backup
(tem dados de alunos).
"""
import argparse, datetime as dt, json, os, subprocess, sys
import requests
from google.oauth2 import service_account
import google.auth.transport.requests

ap = argparse.ArgumentParser()
ap.add_argument("--saida", default=r"C:\Users\PC- Amanda\Desktop\science-english-app-main\backup-dados")
ap.add_argument("--respostas", action="store_true", help="inclui as respostas escritas dos alunos")
args = ap.parse_args()

KEY = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or r"C:\Users\PC- Amanda\.firebase\scienceenglish-service-account.json"
creds = service_account.Credentials.from_service_account_file(KEY, scopes=["https://www.googleapis.com/auth/datastore"])
creds.refresh(google.auth.transport.requests.Request())
H = {"Authorization": "Bearer " + creds.token}
BASE = "https://firestore.googleapis.com/v1/projects/scienceenglish/databases/(default)/documents"

def val(v):
    if "mapValue" in v: return {k: val(x) for k, x in v["mapValue"].get("fields", {}).items()}
    if "arrayValue" in v: return [val(x) for x in v["arrayValue"].get("values", [])]
    for k in ("integerValue", "doubleValue"):
        if k in v: return float(v[k]) if k == "doubleValue" or "." in str(v[k]) else int(v[k])
    for k in ("stringValue", "booleanValue", "timestampValue"):
        if k in v: return v[k]
    return None

def docs(path):
    out, tok = [], None
    while True:
        p = {"pageSize": 300}
        if tok: p["pageToken"] = tok
        r = requests.get(BASE + "/" + path, headers=H, params=p)
        if r.status_code == 404: return out
        r.raise_for_status()
        j = r.json()
        out += [(d["name"].split("/")[-1], {k: val(v) for k, v in d.get("fields", {}).items()}) for d in j.get("documents", [])]
        tok = j.get("nextPageToken")
        if not tok: return out

def so(d, chaves): return {k: d[k] for k in chaves if k in d}

CAD = ["name", "firstName", "slug", "level", "schoolId", "createdAt", "inicioCurso", "archived", "aulaDias", "aulaDuracao", "aulaHora",
       "aulaHorarios", "aulaFins", "aulaDiasDesde", "diasAulas", "metaAnual", "metaEstudo", "challengeEnabled", "attendanceBaseline",
       "attendancePresentDates", "attendanceMakeups", "review90", "reviewNextPromptAt"]
agora = dt.datetime.now()
pasta = os.path.join(args.saida, agora.strftime("%Y-%m-%d_%H%M"))
os.makedirs(pasta, exist_ok=True)

alunos = docs("students")
saida = {"alunos": [], "uso": [], "posaulas": [], "atividades": [], "extras": [], "desafio_envios": [], "desafio_rodadas": []}
for uid, s in alunos:
    saida["alunos"].append({"uid": uid, **so(s, CAD)})
    for dia, f in docs(f"students/{uid}/usage"): saida["uso"].append({"uid": uid, "nome": s.get("name"), "dia": dia, **f})
    for pid, f in docs(f"students/{uid}/posaulas"): saida["posaulas"].append({"uid": uid, "nome": s.get("name"), "id": pid, **so(f, ["filename", "title", "createdAt", "readAt", "url"])})
    for aid, f in docs(f"students/{uid}/activities"):
        campos = ["title", "week", "createdAt", "status", "finalizada", "partsDone", "conclusao", "summary", "correctedAt", "publicationDate", "oralSubmittedAt", "oralReviewPending"] + (["respostas"] if args.respostas else [])
        saida["atividades"].append({"uid": uid, "nome": s.get("name"), "id": aid, **so(f, campos)})
    for eid, f in docs(f"students/{uid}/extras"):
        saida["extras"].append({"uid": uid, "nome": s.get("name"), "id": eid, **so(f, ["title", "skill", "level", "assignedAt", "status", "finalizada", "finalizadaEm"])})
    for sid, f in docs(f"students/{uid}/challengeSubmissions"):
        saida["desafio_envios"].append({"uid": uid, "nome": s.get("name"), "id": sid, **{k: v for k, v in f.items() if args.respostas or k != "answers"}})
    for rid, f in docs(f"students/{uid}/challengeRounds"):
        saida["desafio_rodadas"].append({"uid": uid, "nome": s.get("name"), "id": rid, **so(f, ["weekKey", "part", "difficulty", "opensAt", "closesAt", "questionCount", "personalized", "status"])})

escolas = {}
for sid, f in docs("schools"):
    escolas[sid] = {"adesao": f.get("adesao"), "nome": f.get("name")}
    saida["adesaoSemanal_" + sid] = [{"id": i, **d} for i, d in docs(f"schools/{sid}/adesaoSemanal")]
    saida["adesaoStats_" + sid] = [{"id": i, **d} for i, d in docs(f"schools/{sid}/adesaoStats")]
saida["escolas"] = escolas

for nome, linhas in saida.items():
    with open(os.path.join(pasta, nome + ".json"), "w", encoding="utf-8") as fh:
        json.dump(linhas, fh, ensure_ascii=False, indent=1)
leitura = os.path.join(os.path.dirname(os.path.abspath(__file__)), "relatorio_leitura_posaulas.py")
if os.path.exists(leitura):
    subprocess.run([sys.executable, leitura, os.path.join(pasta, "leitura_posaulas.csv")], check=False, capture_output=True)
resumo = [f"Backup feito em {agora:%d/%m/%Y %H:%M}", f"Respostas escritas incluídas: {'sim' if args.respostas else 'não'}", ""] + [f"{n}: {len(v) if isinstance(v, list) else 'ok'}" for n, v in saida.items()]
open(os.path.join(pasta, "LEIA-ME.txt"), "w", encoding="utf-8").write("\n".join(resumo) + "\nDados de alunos: não versionar nem enviar a ninguém.\n")
print("\n".join(resumo)); print("pasta:", pasta)
