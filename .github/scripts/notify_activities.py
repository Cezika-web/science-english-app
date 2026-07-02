#!/usr/bin/env python3
"""
Envia notificação push "Novas atividades" para um aluno (pelo slug) ou para todos.
Uso: python notify_activities.py <slug|todos>
Ex:  python notify_activities.py gu
     python notify_activities.py isabelle-bueno
     python notify_activities.py todos
"""

import json
import os
import sys
import requests
from google.oauth2 import service_account
import google.auth.transport.requests

TITLE = "Novas atividades para você! 📚"
BODY = "Abra sua área e confira as atividades novas."
APP_URL = "https://cezika-web.github.io/science-english-app/"


def get_auth():
    sa_info = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT"])
    project_id = sa_info["project_id"]
    credentials = service_account.Credentials.from_service_account_info(
        sa_info,
        scopes=[
            "https://www.googleapis.com/auth/datastore",
            "https://www.googleapis.com/auth/firebase.messaging",
        ],
    )
    auth_req = google.auth.transport.requests.Request()
    credentials.refresh(auth_req)
    return credentials.token, project_id


def collect_tokens(fields):
    tokens = []
    ft = fields.get("fcmToken", {}).get("stringValue", "")
    if ft:
        tokens.append(ft)
    for v in fields.get("fcmTokens", {}).get("arrayValue", {}).get("values", []):
        t = v.get("stringValue", "")
        if t and t not in tokens:
            tokens.append(t)
    return tokens


def send_push(auth_token, project_id, fcm_token):
    msg = {
        "message": {
            "token": fcm_token,
            "data": {"url": APP_URL, "title": TITLE, "body": BODY},
            "webpush": {
                "headers": {"Urgency": "high"},
                "data": {"url": APP_URL, "title": TITLE, "body": BODY},
                "fcm_options": {"link": APP_URL},
            },
        }
    }
    return requests.post(
        f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send",
        headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
        json=msg,
    )


def main():
    target = (sys.argv[1] if len(sys.argv) > 1 else "todos").strip().lower()
    print(f"Alvo: {target}")

    auth_token, project_id = get_auth()
    headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    base_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}"
        "/databases/(default)/documents"
    )

    students = []
    if target in ("todos", "all", "*"):
        url = f"{base_url}/students?pageSize=300"
        while url:
            resp = requests.get(url, headers=headers).json()
            students.extend(resp.get("documents", []))
            nxt = resp.get("nextPageToken")
            url = f"{base_url}/students?pageSize=300&pageToken={nxt}" if nxt else None
    else:
        resp = requests.post(
            f"{base_url}:runQuery",
            headers=headers,
            json={
                "structuredQuery": {
                    "from": [{"collectionId": "students"}],
                    "where": {
                        "fieldFilter": {
                            "field": {"fieldPath": "slug"},
                            "op": "EQUAL",
                            "value": {"stringValue": target},
                        }
                    },
                    "limit": 1,
                }
            },
        )
        for row in resp.json():
            if "document" in row:
                students.append(row["document"])

    if not students:
        print(f"Nenhum aluno encontrado para '{target}'.")
        sys.exit(0)

    total_sent = 0
    for doc in students:
        fields = doc.get("fields", {})
        if fields.get("archived", {}).get("booleanValue", False):
            continue  # pula ex-alunos
        first_name = fields.get("firstName", {}).get("stringValue", "Aluno")
        tokens = collect_tokens(fields)
        if not tokens:
            print(f"- {first_name}: sem token de notificação, pulando.")
            continue
        for t in tokens:
            r = send_push(auth_token, project_id, t)
            if r.status_code == 200:
                total_sent += 1
                print(f"✅ Enviado para {first_name}")
            else:
                print(f"❌ Erro ({first_name}): {r.status_code} {r.text[:200]}")

    print(f"Total de notificações enviadas: {total_sent}")


if __name__ == "__main__":
    main()
