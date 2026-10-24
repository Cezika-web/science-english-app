"""Relatório de leitura dos pós-aulas (somente leitura).

Soma, por aluno e por pós-aula, o tempo medido de leitura (students/{uid}/usage/{dia}.items.pos_<id>) em todos os
dias, mais quantas vezes o pós-aula foi aberto (itemOpens) e em quantos dias foi lido. O tempo só existe desde o
início da medição (21/10/2026); antes disso não há dado.

Uso:  python tools/relatorio_leitura_posaulas.py saida.csv [AAAA-MM-DD]
      (o 2º argumento é a data de aula mais antiga a listar mesmo sem leitura; padrão: 14 dias atrás)
Credencial: variável GOOGLE_APPLICATION_CREDENTIALS (service account). Nunca versionar o arquivo da chave.
"""
import csv, datetime as dt, os, re, sys
import requests
from google.oauth2 import service_account
import google.auth.transport.requests

KEY = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or r"C:\Users\PC- Amanda\.firebase\scienceenglish-service-account.json"
creds = service_account.Credentials.from_service_account_file(KEY, scopes=["https://www.googleapis.com/auth/datastore"])
creds.refresh(google.auth.transport.requests.Request())
H = {"Authorization": "Bearer " + creds.token}
BASE = "https://firestore.googleapis.com/v1/projects/scienceenglish/databases/(default)/documents"

def val(v):
    if "mapValue" in v: return {k: val(x) for k, x in v["mapValue"].get("fields", {}).items()}
    if "arrayValue" in v: return [val(x) for x in v["arrayValue"].get("values", [])]
    for k in ("integerValue", "doubleValue"):
        if k in v: return float(v[k])
    for k in ("stringValue", "booleanValue", "timestampValue"):
        if k in v: return v[k]
    return None

def docs(path, mask=None):
    out, tok = [], None
    while True:
        p = {"pageSize": 300}
        if tok: p["pageToken"] = tok
        if mask: p["mask.fieldPaths"] = mask
        r = requests.get(BASE + "/" + path, headers=H, params=p)
        if r.status_code == 404: return out
        r.raise_for_status()
        j = r.json()
        out += [(d["name"].split("/")[-1], {k: val(v) for k, v in d.get("fields", {}).items()}) for d in j.get("documents", [])]
        tok = j.get("nextPageToken")
        if not tok: return out

def chave(pid): return "pos_" + re.sub(r"[^A-Za-z0-9_-]", "_", str(pid))   # mesma regra do cronômetro (itemKey)
def brt(iso): return (dt.datetime.fromisoformat(iso.replace("Z", "+00:00")) - dt.timedelta(hours=3))
def data_da_aula(filename, pid):
    m = re.search(r"(\d{2})-(\d{2})-(20\d{2})", f"{filename or ''} {pid}")
    return f"{m.group(3)}-{m.group(1)}-{m.group(2)}" if m else ""
def virg(x): return str(round(x, 1)).replace(".", ",")

saida = sys.argv[1]
corte = sys.argv[2] if len(sys.argv) > 2 else (dt.date.today() - dt.timedelta(days=14)).isoformat()
linhas, total_geral = [], 0.0
for uid, s in docs("students"):
    if not s.get("name") or s.get("archived"): continue
    secs, abert, dias = {}, {}, {}
    for dia, f in docs(f"students/{uid}/usage"):
        for k, v in (f.get("items") or {}).items():
            if k.startswith("pos_"):
                secs[k] = secs.get(k, 0) + float(v)
                if float(v) > 0: dias.setdefault(k, []).append(dia)
        for k, v in (f.get("itemOpens") or {}).items():
            if k.startswith("pos_"): abert[k] = abert.get(k, 0) + float(v)
    vistos = set()
    for pid, p in docs(f"students/{uid}/posaulas"):
        k = chave(pid); vistos.add(k)
        d = data_da_aula(p.get("filename"), pid)
        if secs.get(k, 0) <= 0 and abert.get(k, 0) <= 0 and d < corte: continue
        total_geral += secs.get(k, 0)
        linhas.append([s["name"], p.get("title") or pid, d, virg(secs.get(k, 0) / 60), int(abert.get(k, 0)), len(dias.get(k, [])),
                       ", ".join(sorted(dias.get(k, []))), brt(p["readAt"]).strftime("%Y-%m-%d %H:%M") if p.get("readAt") else ""])
    for k in secs:   # leitura de pós-aula que não existe mais na lista do aluno
        if k not in vistos:
            linhas.append([s["name"], "(pós-aula removido) " + k[4:], "", virg(secs[k] / 60), int(abert.get(k, 0)), len(dias.get(k, [])), ", ".join(sorted(dias.get(k, []))), ""])
            total_geral += secs[k]

linhas.sort(key=lambda r: (r[0].lower(), r[2]))
with open(saida, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh, delimiter=";")
    w.writerow(["Aluno", "Pós-aula", "Data da aula", "Minutos lendo (total)", "Vezes aberto", "Dias em que leu", "Quais dias", "Primeira leitura (readAt)"])
    w.writerows(linhas)
lidas = [r for r in linhas if float(r[3].replace(",", ".")) > 0]
print(f"{len(linhas)} linhas | {len(lidas)} pós-aulas com leitura medida | total lido: {virg(total_geral / 60)} min")
print("salvo em", saida)
