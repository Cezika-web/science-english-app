#!/usr/bin/env python3
"""
Conserta a data das pós-aulas JÁ salvas no Firestore.

Até agora o `createdAt` era a hora do envio do arquivo, não a data da aula — por
isso uma aula de 31/07 subida em 01/08 aparecia no app dentro de agosto. A data
certa sempre esteve no nome do arquivo (`pos-aula-{slug}-MM-DD-YYYY.html`); este
script relê esse nome e regrava o `createdAt` (e o `title`) com a data da aula.

Só mexe em documento que tem `filename` — pós-aula publicada pelo painel não tem
nome de arquivo e fica intacta.

Uso:
    # 1) confere o que mudaria, sem gravar nada
    python fix_posaula_dates.py --sa "C:/caminho/service-account.json"

    # 2) grava de verdade
    python fix_posaula_dates.py --sa "C:/caminho/service-account.json" --aplicar

Credencial: FIREBASE_SERVICE_ACCOUNT, GOOGLE_APPLICATION_CREDENTIALS ou --sa.
"""

import argparse
import json
import os
import sys

import requests
from google.oauth2 import service_account
import google.auth.transport.requests

from notify_student import parse_class_date


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


def date_from_filename(filename):
    """Mesma leitura do notify_student.py: os 3 últimos pedaços são a data."""
    base = filename
    if base.startswith("pos-aula-"):
        base = base[9:]
    if base.endswith(".html"):
        base = base[:-5]
    parts = base.split("-")
    if len(parts) < 4:
        return None, base
    return parse_class_date(parts[-3:])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sa", help="caminho do service-account.json")
    ap.add_argument("--aplicar", action="store_true",
                    help="grava as mudancas (sem isso, so mostra o que mudaria)")
    args = ap.parse_args()

    creds, project_id = load_credentials(args.sa)
    headers = {
        "Authorization": f"Bearer {creds.token}",
        "Content-Type": "application/json",
    }
    base = (f"https://firestore.googleapis.com/v1/projects/{project_id}"
            "/databases/(default)/documents")

    alunos = requests.get(f"{base}/students", headers=headers,
                          params={"pageSize": 300}).json().get("documents", [])

    total = corrigidas = iguais = sem_data = 0

    for aluno in alunos:
        uid = aluno["name"].split("/")[-1]
        nome = aluno.get("fields", {}).get("name", {}).get("stringValue", uid)

        pagina = None
        while True:
            params = {"pageSize": 300}
            if pagina:
                params["pageToken"] = pagina
            resp = requests.get(f"{base}/students/{uid}/posaulas",
                                headers=headers, params=params).json()

            for doc in resp.get("documents", []):
                campos = doc.get("fields", {})
                filename = campos.get("filename", {}).get("stringValue", "")
                if not filename:
                    continue

                total += 1
                data, texto = date_from_filename(filename)
                if data is None:
                    sem_data += 1
                    print(f"  ?  {nome}: data ilegivel em {filename}")
                    continue

                novo = data.strftime("%Y-%m-%dT%H:%M:%SZ")
                atual = campos.get("createdAt", {}).get("timestampValue", "")
                if atual[:10] == novo[:10]:
                    iguais += 1
                    continue

                corrigidas += 1
                print(f"  ->  {nome}: {atual[:10] or '(vazio)'}  =>  {novo[:10]}   {filename}")

                if not args.aplicar:
                    continue

                doc_id = doc["name"].split("/")[-1]
                mask = ("updateMask.fieldPaths=createdAt"
                        "&updateMask.fieldPaths=classDate"
                        "&updateMask.fieldPaths=title")
                r = requests.patch(
                    f"{base}/students/{uid}/posaulas/{doc_id}?{mask}",
                    headers=headers,
                    json={"fields": {
                        "createdAt": {"timestampValue": novo},
                        "classDate": {"timestampValue": novo},
                        "title": {"stringValue": f"Pós-aula {texto}"},
                    }},
                )
                if r.status_code not in (200, 201):
                    print(f"      ERRO {r.status_code}: {r.text[:200]}")

            pagina = resp.get("nextPageToken")
            if not pagina:
                break

    print(f"\n{total} pos-aula(s) com nome de arquivo | "
          f"{corrigidas} com data errada | {iguais} ja certas | {sem_data} ilegiveis")
    if corrigidas and not args.aplicar:
        print("Nada foi gravado. Rode de novo com --aplicar para corrigir.")


if __name__ == "__main__":
    main()
