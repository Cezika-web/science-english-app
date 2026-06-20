#!/usr/bin/env python3
"""
Notifica aluno quando um novo pós-aula é enviado ao GitHub.
Uso: python notify_student.py <filename>
Ex:  python notify_student.py pos-aula-mateus-richter-20-06-2026.html
"""

import json
import os
import sys
import datetime
import requests
from google.oauth2 import service_account
import google.auth.transport.requests


def main():
    if len(sys.argv) < 2:
        print("Usage: notify_student.py <filename>")
        sys.exit(1)

    filename = sys.argv[1]
    print(f"Processing: {filename}")

    # Parse slug from filename: pos-aula-{slug}-DD-MM-YYYY.html
    basename = filename
    if basename.startswith("pos-aula-"):
        basename = basename[9:]
    if basename.endswith(".html"):
        basename = basename[:-5]

    # Last 3 dash-segments are DD, MM, YYYY — everything before is the slug
    parts = basename.split("-")
    if len(parts) < 4:
        print(f"Cannot parse filename: {filename}")
        sys.exit(1)

    date_str = "-".join(parts[-3:])   # e.g. 20-06-2026
    slug = "-".join(parts[:-3])       # e.g. mateus-richter

    print(f"Slug: {slug} | Date: {date_str}")

    # Load service account from env
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

    base_url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}"
        "/databases/(default)/documents"
    )

    # ── Find student by slug ──────────────────────────────────────────────────
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
                        "value": {"stringValue": slug},
                    }
                },
                "limit": 1,
            }
        },
    )
    results = resp.json()

    if not results or "document" not in results[0]:
        print(f"Student with slug '{slug}' not found — skipping.")
        sys.exit(0)

    student_doc = results[0]["document"]
    uid = student_doc["name"].split("/")[-1]
    fields = student_doc.get("fields", {})
    first_name = fields.get("firstName", {}).get("stringValue", "Aluno")
    fcm_token = fields.get("fcmToken", {}).get("stringValue", "")

    print(f"Student found: {first_name} (uid: {uid})")

    # ── Save pós-aula to Firestore ────────────────────────────────────────────
    posaula_url = (
        f"https://cezika-web.github.io/science-english-app/{filename}"
    )
    now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    resp = requests.post(
        f"{base_url}/students/{uid}/posaulas",
        headers=headers,
        json={
            "fields": {
                "filename": {"stringValue": filename},
                "url": {"stringValue": posaula_url},
                "title": {"stringValue": f"Pós-aula {date_str}"},
                "createdAt": {"timestampValue": now},
                "readAt": {"nullValue": None},
            }
        },
    )

    if resp.status_code in (200, 201):
        print("✅ Pós-aula saved to Firestore")
    else:
        print(f"❌ Firestore error: {resp.status_code} {resp.text}")
        sys.exit(1)

    # ── Send FCM push notification ────────────────────────────────────────────
    if not fcm_token:
        print("ℹ️  No FCM token — student hasn't enabled notifications yet.")
        return

    resp = requests.post(
        f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send",
        headers=headers,
        json={
            "message": {
                "token": fcm_token,
                "notification": {
                    "title": "Novo pós-aula! 📚",
                    "body": f"Seu resumo de aula está pronto, {first_name}!",
                },
                "webpush": {
                    "fcm_options": {
                        "link": posaula_url
                    }
                },
            }
        },
    )

    if resp.status_code == 200:
        print(f"✅ Push notification sent to {first_name}")
    else:
        print(f"❌ FCM error: {resp.status_code} {resp.text}")


if __name__ == "__main__":
    main()
