#!/usr/bin/env python3
"""
Puxa as atividades + respostas de um aluno direto do Firestore e imprime
tudo alinhado (questão -> resposta do aluno), pronto para a skill de correção.

Uso:
    python fetch_answers.py <nome-ou-slug> [--sa CAMINHO_DO_SERVICE_ACCOUNT.json]

Credencial (uma das opções):
    - variável de ambiente FIREBASE_SERVICE_ACCOUNT (conteúdo JSON), ou
    - variável GOOGLE_APPLICATION_CREDENTIALS (caminho do .json), ou
    - flag --sa CAMINHO.json

Saída: texto UTF-8 no stdout. No Windows, redirecione para arquivo:
    python fetch_answers.py douglas --sa "C:/.../service-account.json" > douglas.txt
"""

import argparse
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlparse

import requests
from google.oauth2 import service_account
import google.auth.transport.requests


def load_credentials(sa_flag):
    if os.environ.get("FIREBASE_SERVICE_ACCOUNT"):
        info = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT"])
    else:
        path = sa_flag or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if not path or not os.path.exists(path):
            sys.exit("Service account nao encontrado. Use --sa CAMINHO.json ou "
                     "defina FIREBASE_SERVICE_ACCOUNT / GOOGLE_APPLICATION_CREDENTIALS.")
        with open(path, encoding="utf-8") as f:
            info = json.load(f)
    creds = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/datastore"])
    creds.refresh(google.auth.transport.requests.Request())
    return creds, info["project_id"]


def find_student(base, headers, target):
    target = target.lower()
    resp = requests.get(f"{base}/students", headers=headers, params={"pageSize": 300})
    all_students = []
    for doc in resp.json().get("documents", []):
        f = doc.get("fields", {})
        name = f.get("name", {}).get("stringValue", "")
        slug = f.get("slug", {}).get("stringValue", "")
        uid = doc["name"].split("/")[-1]
        all_students.append((uid, name, slug))
        if target in name.lower() or target in slug.lower():
            return (uid, name, slug), all_students
    return None, all_students


def html_questions(content):
    """Extrai as questões (cada <li>) de um bloco HTML, na ordem do documento."""
    items = re.findall(r"<li>(.*?)</li>", content, flags=re.S | re.I)
    clean = []
    for it in items:
        it = re.sub(r"<[^>]+>", " ", it)          # tira tags internas
        it = re.sub(r"&nbsp;", " ", it)
        it = re.sub(r"\s+", " ", it).strip()
        clean.append(it)
    return clean


def s(field):
    """Valor string de um campo Firestore (ou vazio)."""
    return (field or {}).get("stringValue", "")


def firestore_value(field):
    """Converte um valor da API REST do Firestore para tipos Python."""
    field = field or {}
    if "stringValue" in field:
        return field["stringValue"]
    if "booleanValue" in field:
        return field["booleanValue"]
    if "integerValue" in field:
        return int(field["integerValue"])
    if "doubleValue" in field:
        return float(field["doubleValue"])
    if "nullValue" in field:
        return None
    if "arrayValue" in field:
        return [firestore_value(item) for item in field["arrayValue"].get("values", [])]
    if "mapValue" in field:
        return {key: firestore_value(value) for key, value in field["mapValue"].get("fields", {}).items()}
    return None


def download_audio(url, target_dir, stem):
    if not url or not target_dir:
        return ""
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    content_type = response.headers.get("content-type", "audio/webm").split(";")[0]
    suffixes = {"audio/mp4": ".m4a", "audio/aac": ".m4a", "audio/mpeg": ".mp3", "audio/ogg": ".ogg"}
    suffix = suffixes.get(content_type)
    if not suffix:
        suffix = Path(urlparse(url).path).suffix if Path(urlparse(url).path).suffix in {".webm", ".m4a", ".mp3", ".ogg", ".wav"} else ".webm"
    folder = Path(target_dir)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{stem}{suffix}"
    path.write_bytes(response.content)
    return str(path.resolve())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("student", help="nome ou slug do aluno")
    ap.add_argument("--sa", help="caminho do service-account.json")
    ap.add_argument("--audio-dir", help="pasta para baixar as gravações originais")
    ap.add_argument("--only-awaiting", action="store_true", help="mostra só atividades finalizadas aguardando correção")
    args = ap.parse_args()

    creds, project_id = load_credentials(args.sa)
    headers = {"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json"}
    base = (f"https://firestore.googleapis.com/v1/projects/{project_id}"
            "/databases/(default)/documents")

    found, all_students = find_student(base, headers, args.student)
    if not found:
        print("Aluno nao encontrado. Disponiveis:")
        for _uid, name, slug in all_students:
            print(f"  - {name}  (slug: {slug})")
        return
    uid, name, slug = found

    resp = requests.get(f"{base}/students/{uid}/activities",
                        headers=headers, params={"pageSize": 100})
    docs = resp.json().get("documents", [])

    print(f"ALUNO: {name}   (slug: {slug}   uid: {uid})")
    print(f"{len(docs)} atividade(s) no app.\n")

    for doc in docs:
        fields = doc.get("fields", {})
        title = s(fields.get("title")) or "(sem titulo)"
        week = s(fields.get("week"))
        finalizada = fields.get("finalizada", {}).get("booleanValue", False)
        status = s(fields.get("status"))
        oral_review_pending = fields.get("oralReviewPending", {}).get("booleanValue", False)
        if args.only_awaiting and (not finalizada or (status == "corrected" and not oral_review_pending)):
            continue
        respostas = (fields.get("respostas", {})
                     .get("mapValue", {}).get("fields", {}))

        estado = "ÁUDIO FINALIZADO (aguardando correção)" if oral_review_pending else \
                 "CORRIGIDA" if status == "corrected" else \
                 "FINALIZADA (aguardando correcao)" if finalizada else "PENDENTE"

        print("=" * 66)
        print(f"ATIVIDADE: {title}")
        if week:
            print(f"Semana: {week}")
        print(f"Estado: {estado}   |   doc_id: {doc['name'].split('/')[-1]}")
        print("=" * 66)

        parts = fields.get("parts", {}).get("arrayValue", {}).get("values", [])
        if not parts:
            print("  (sem estrutura de partes neste doc)\n")
            continue

        for p in parts:
            pf = p.get("mapValue", {}).get("fields", {})
            pid = s(pf.get("id"))
            ptitle = s(pf.get("title"))
            ptype = s(pf.get("type"))
            content = s(pf.get("content"))
            questions = html_questions(content)
            oral = firestore_value(pf.get("oralExercise")) or {}

            ans_map = (respostas.get(pid, {})
                       .get("mapValue", {}).get("fields", {}))

            print(f"\n--- {pid.upper()}: {ptitle}  [{ptype}] ---")
            for i, q in enumerate(questions):
                a = s(ans_map.get(f"e{i}"))
                a = a if a.strip() else "(em branco)"
                print(f"  {i+1}. {q}")
                print(f"     >> RESPOSTA DO ALUNO: {a}")
            oral_saved = firestore_value(ans_map.get("_oral")) or {}
            for i, prompt in enumerate(oral.get("prompts", [])):
                clip_id = prompt.get("id") or f"clip-{i+1}"
                print(f"  ORAL {i+1}. {prompt.get('prompt') or 'Grave sua resposta em inglês.'}")
                clip = oral_saved.get(clip_id) or {}
                url = clip.get("url", "") if isinstance(clip, dict) else ""
                if url:
                    safe_stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", f"{doc['name'].split('/')[-1]}-{pid}-{clip_id}")
                    try:
                        path = download_audio(url, args.audio_dir, safe_stem)
                        print(f"     >> ÁUDIO DO ALUNO: {path or url}")
                    except Exception as error:
                        print(f"     >> ÁUDIO DO ALUNO: erro ao baixar ({error})")
                else:
                    print("     >> ÁUDIO DO ALUNO: (não enviado)")
        print()


if __name__ == "__main__":
    main()
