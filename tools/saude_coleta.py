"""Saúde da coleta de dados de adesão (somente leitura). Mostra, desde a data de início, quem tem uso medido, quem sumiu, anomalias
nos documentos e a adoção dos campos novos (hora do dia, versão do app, erros).

Uso:  python tools/saude_coleta.py [AAAA-MM-DD]      (padrão: 2026-10-21, o início da medição)
"""
import collections, datetime as dt, os, sys
import requests
from google.oauth2 import service_account
import google.auth.transport.requests

DESDE = sys.argv[1] if len(sys.argv) > 1 else "2026-10-21"
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

hoje = dt.date.today().isoformat()
ativos = [(u, s) for u, s in docs("students") if s.get("name") and not s.get("archived")]
print(f"Hoje {hoje} | medição desde {DESDE} | alunos ativos: {len(ativos)}")
print("com notificação (fcmToken):", sum(1 for _, s in ativos if s.get("fcmToken") or s.get("fcmTokens")), "| com metas de estudo escolhidas:", sum(1 for _, s in ativos if s.get("metaEstudo")))

por_dia = collections.Counter(); sem, ultimo = [], {}
versoes, plats, pwa, com_horas, docs_total, erros_w, erros_js, anomalias = collections.Counter(), collections.Counter(), collections.Counter(), 0, 0, 0, 0, []
sem_app = collections.Counter()
perdido = collections.Counter(); perdido_por_aluno = collections.Counter()
for uid, s in ativos:
    us = [(d, f) for d, f in docs(f"students/{uid}/usage") if d >= DESDE]
    if not us: sem.append(s["name"]); continue
    ultimo[s["name"]] = max(d for d, _ in us)
    for d, f in us:
        docs_total += 1; por_dia[d] += 1
        sec = f.get("secs") or {}
        tot = float(sec.get("total", 0)); areas = sum(float(sec.get(k, 0)) for k in ("posaula", "atividade", "desafio", "vocab", "outros"))
        if abs(tot - areas) > 5: anomalias.append(f"{s['name']} {d}: total {round(tot)} s x áreas {round(areas)} s")
        if tot > 6 * 3600: anomalias.append(f"{s['name']} {d}: mais de 6 h no dia")
        if len(f.get("items") or {}) > 50: anomalias.append(f"{s['name']} {d}: perto do teto de 60 itens")
        a = f.get("app")
        if a: versoes[a.get("v", "?")] += 1; plats[a.get("plat", "?")] += 1; pwa["instalado" if a.get("pwa") else "navegador"] += 1
        else: sem_app[s["name"]] += 1
        if f.get("hours"): com_horas += 1
        e = f.get("errs") or {}; erros_w += float(e.get("w", 0)); erros_js += float(e.get("js", 0))
        for k, v in (f.get("lost") or {}).items(): perdido[k] += float(v); perdido_por_aluno[s["name"]] += float(v)

print("\nAlunos com uso medido por dia:", dict(sorted(por_dia.items())))
print(f"Documentos de uso: {docs_total} | alunos com algum dia medido: {len(ultimo)} | sem nenhum: {len(sem)}")
print("SEM NENHUM DIA MEDIDO:", ", ".join(sem) or "ninguém")
sumidos = [(n, d) for n, d in ultimo.items() if d < (dt.date.fromisoformat(hoje) - dt.timedelta(days=3)).isoformat()]
print("SUMIRAM (último dia medido há mais de 3 dias):", ", ".join(f"{n} ({d})" for n, d in sorted(sumidos)) or "ninguém")
print("\nCampos novos (a partir da versão que grava hora, versão e erros):")
print("  documentos com versão do app:", sum(versoes.values()), "| versões:", dict(versoes), "| aparelho:", dict(plats), "| instalado ou navegador:", dict(pwa))
print("  documentos com hora do dia:", com_horas, "| falhas de gravação informadas:", int(erros_w), "| erros do app informados:", int(erros_js))
print("  alunos com documentos SEM versão (app antigo ou dia anterior à atualização):", dict(sem_app) or "nenhum")
print("\nTempo parado DESCARTADO em tela de estudo (segundos que voltariam com um limite maior; limite atual 60 s):")
if perdido:
    acum = 0
    for k in ("g90", "g120", "g180", "g300"):
        acum += perdido.get(k, 0)
        print(f"  com limite de {k[1:]} s voltariam +{round(acum / 60, 1)} min no total (faixa {k}: {round(perdido.get(k, 0) / 60, 1)} min)")
    print("  por aluno (min descartados, até 5 min):", {n: round(v / 60, 1) for n, v in perdido_por_aluno.most_common(8)})
else:
    print("  ainda sem dados (campo novo; começa a encher quando os alunos abrem a versão nova)")
print("\nAnomalias:", anomalias or "nenhuma")
