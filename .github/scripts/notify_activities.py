#!/usr/bin/env python3
"""
Notifica alunos quando novas ATIVIDADES são publicadas no app (pelo painel admin).

Diferente do pós-aula (que é acionado por um arquivo no Git), as atividades são
gravadas direto no Firestore pelo navegador. Por isso este script roda em intervalos
(GitHub Action agendada): ele varre as atividades marcadas com `notified: false`,
envia UMA notificação por aluno (mesmo que tenha publicado várias de uma vez) e
marca cada atividade como `notified: true` para não repetir.

Uso: python notify_activities.py
"""

import json
import os
import sys

import requests
from google.oauth2 import service_account
import google.auth.transport.requests

ICON = "https://cezika-web.github.io/science-english-app/icons/icon-192.png"
APP_URL = "https://cezika-web.github.io/science-english-app/"


def get_headers():
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
    headers = {
        "Authorization": f"Bearer {credentials.token}",
        "Content-Type": "application/json",
    }
    return headers, project_id


def list_students(base_url, headers):
    """Retorna [(uid, first_name, fcm_token), ...] de todos os alunos."""
    students = []
    page_token = None
    while True:
        params = {"pageSize": 300}
        if page_token:
            params["pageToken"] = page_token
        resp = requests.get(f"{base_url}/students", headers=headers, params=params)
        data = resp.json()
        for doc in data.get("documents", []):
            uid = doc["name"].split("/")[-1]
            fields = doc.get("fields", {})
            first_name = fields.get("firstName", {}).get("stringValue", "Aluno")
            fcm_token = fields.get("fcmToken", {}).get("stringValue", "")
            students.append((uid, first_name, fcm_token))
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return students


def pending_activities(base_url, headers, uid):
    """Atividades desse aluno com notified == false. Retorna [(doc_id, title), ...]."""
    resp = requests.post(
        f"{base_url}/students/{uid}:runQuery",
        headers=headers,
        json={
            "structuredQuery": {
                "from": [{"collectionId": "activities"}],
                "where": {
                    "fieldFilter": {
                        "field": {"fieldPath": "notified"},
                        "op": "EQUAL",
                        "value": {"booleanValue": False},
                    }
                },
            }
        },
    )
    out = []
    for row in resp.json():
        doc = row.get("document")
        if not doc:
            continue
        doc_id = doc["name"].split("/")[-1]
        title = doc.get("fields", {}).get("title", {}).get("stringValue", "Atividade")
        out.append((doc_id, title))
    return out


def mark_notified(base_url, headers, uid, doc_id):
    requests.patch(
        f"{base_url}/students/{uid}/activities/{doc_id}",
        headers=headers,
        params={"updateMask.fieldPaths": "notified"},
        json={"fields": {"notified": {"booleanValue": True}}},
    )


def send_push(project_id, headers, fcm_token, title, body):
    resp = requests.post(
        f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send",
        headers=headers,
        json={
            "message": {
                "token": fcm_token,
                "notification": {"title": title, "body": body},
                "webpush": {
                    "notification": {
                        "title": title,
                        "body": body,
                        "icon": ICON,
                        "badge": ICON,
                    },
                    "data": {"url": APP_URL},
                    "fcm_options": {"link": APP_URL},
                },
            }
        },
    )
    return resp


def main():
    headers, project_id = get_headers()
    base_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}"
        "/databases/(default)/documents"
    )

    students = list_students(base_url, headers)
    print(f"Checking {len(students)} student(s) for new activities...")

    total_sent = 0
    for uid, first_name, fcm_token in students:
        acts = pending_activities(base_url, headers, uid)
        if not acts:
            continue

        n = len(acts)
        print(f"── {first_name} ({uid}): {n} new activity(ies)")

        # Envia UMA notificação resumindo, se o aluno já autorizou push.
        if fcm_token:
            if n == 1:
                body = f"{first_name}, você tem uma nova atividade: {acts[0][1]}"
            else:
                body = f"{first_name}, você tem {n} novas atividades para fazer!"
            resp = send_push(project_id, headers, fcm_token, "Nova atividade! 📝", body)
            if resp.status_code == 200:
                total_sent += 1
                print(f"   ✅ Push enviado para {first_name}")
            else:
                print(f"   ❌ FCM {resp.status_code}: {resp.text[:200]}")
        else:
            print("   ℹ️  Sem token FCM — o aluno ainda não autorizou notificações.")

        # Marca como notificada (dispara uma vez, igual ao pós-aula).
        for doc_id, _title in acts:
            mark_notified(base_url, headers, uid, doc_id)

    print(f"Done. {total_sent} push(es) sent.")


if __name__ == "__main__":
    main()
