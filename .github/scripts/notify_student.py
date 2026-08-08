#!/usr/bin/env python3
"""
Notifica aluno quando um novo pós-aula é enviado ao GitHub.
Uso: python notify_student.py <filename>
Ex:  python notify_student.py pos-aula-mateus-richter-20-06-2026.html
"""

import json
import os
import re
import sys
import datetime
from urllib.parse import quote
import requests
from google.oauth2 import service_account
import google.auth.transport.requests


def parse_talk_time(filename):
    """Extrai percentuais/minutos do bloco padronizado de Talk Time."""
    try:
        with open(filename, "r", encoding="utf-8") as file:
            html = file.read()
    except OSError:
        return None

    def row(css_class):
        found = re.search(
            rf'<tr[^>]*class=["\'][^"\']*{css_class}[^"\']*["\'][^>]*>(.*?)</tr>',
            html,
            re.IGNORECASE | re.DOTALL,
        )
        return found.group(1) if found else ""

    def number(fragment, css_class):
        found = re.search(
            rf'class=["\'][^"\']*{css_class}[^"\']*["\'][^>]*>(.*?)<',
            fragment,
            re.IGNORECASE | re.DOTALL,
        )
        if not found:
            return None
        value = re.search(r'\d+(?:[.,]\d+)?', found.group(1))
        return float(value.group(0).replace(",", ".")) if value else None

    student, teacher = row("row-student"), row("row-teacher")
    values = {
        "studentPct": number(student, "talk-percent"),
        "teacherPct": number(teacher, "talk-percent"),
        "studentMinutes": number(student, "talk-time"),
        "teacherMinutes": number(teacher, "talk-time"),
    }
    return {key: value for key, value in values.items() if value is not None} or None


def parse_class_date(parts):
    """
    Converte os 3 últimos pedaços do nome do arquivo na data da aula.

    O padrão atual é MM-DD-YYYY (`pos-aula-fatima-silva-07-28-2026.html`), mas
    existem arquivos antigos em DD-MM-YYYY. Quando o primeiro número passa de 12
    ele só pode ser o dia, então dá para desambiguar sem chutar.

    Devolve (datetime, "DD/MM/YYYY") ou (None, texto cru) se não der para ler.
    """
    raw = "-".join(parts)
    try:
        a, b, year = (int(p) for p in parts)
    except ValueError:
        return None, raw

    if a > 12 and b <= 12:
        day, month = a, b          # DD-MM-YYYY (formato antigo)
    else:
        month, day = a, b          # MM-DD-YYYY (padrão)

    try:
        # Meio-dia UTC = 09h no Brasil: o dia não vira para trás em nenhum fuso.
        d = datetime.datetime(year, month, day, 12, 0, 0, tzinfo=datetime.timezone.utc)
    except ValueError:
        return None, raw

    return d, d.strftime("%d/%m/%Y")


def main():
    if len(sys.argv) < 2:
        print("Usage: notify_student.py <filename>")
        sys.exit(1)

    filename = sys.argv[1]
    print(f"Processing: {filename}")

    if "/" in filename or not filename.startswith("pos-aula-") or not filename.endswith(".html"):
        print(f"Invalid pós-aula filename: {filename}")
        sys.exit(1)

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

    class_date, date_str = parse_class_date(parts[-3:])   # e.g. 28/07/2026
    slug = "-".join(parts[:-3])       # e.g. mateus-richter
    post_id = filename[:-5]

    print(f"Slug: {slug} | Date: {date_str} | Post ID: {post_id}")
    if class_date is None:
        print("⚠️  Data ilegível no nome do arquivo — usando a hora do envio.")

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
    fcm_tokens = []
    fcm_token = fields.get("fcmToken", {}).get("stringValue", "")
    if fcm_token:
        fcm_tokens.append(fcm_token)
    for value in fields.get("fcmTokens", {}).get("arrayValue", {}).get("values", []):
        token = value.get("stringValue", "")
        if token and token not in fcm_tokens:
            fcm_tokens.append(token)

    print(f"Student found: {first_name} (uid: {uid})")

    # ── Save pós-aula to Firestore ────────────────────────────────────────────
    posaula_url = (
        f"https://cezika-web.github.io/science-english-app/{filename}"
    )
    app_url = (
        "https://cezika-web.github.io/science-english-app/"
        f"?post={quote(post_id)}"
    )
    now = datetime.datetime.now(datetime.timezone.utc)

    # O app agrupa por mês e por quinzena olhando o `createdAt`. Se ele fosse a
    # hora do envio, uma aula de 31/07 subida em 01/08 cairia em agosto. Vale a
    # data que está no nome do arquivo — a data real da aula.
    created_at = (class_date or now).strftime("%Y-%m-%dT%H:%M:%SZ")

    fields = {
        "filename": {"stringValue": filename},
        "url": {"stringValue": posaula_url},
        "appUrl": {"stringValue": app_url},
        "title": {"stringValue": f"Pós-aula {date_str}"},
        "createdAt": {"timestampValue": created_at},
        "publishedAt": {"timestampValue": now.strftime("%Y-%m-%dT%H:%M:%SZ")},
        "readAt": {"nullValue": None},
    }
    if class_date:
        fields["classDate"] = {"timestampValue": created_at}
    talk_time = parse_talk_time(filename)
    if talk_time:
        fields["talkTime"] = {
            "mapValue": {
                "fields": {key: {"doubleValue": value} for key, value in talk_time.items()}
            }
        }

    resp = requests.patch(
        f"{base_url}/students/{uid}/posaulas/{post_id}",
        headers=headers,
        json={"fields": fields},
    )

    if resp.status_code in (200, 201):
        print("✅ Pós-aula saved to Firestore")
    else:
        print(f"❌ Firestore error: {resp.status_code} {resp.text}")
        sys.exit(1)

    # ── Send FCM push notification ────────────────────────────────────────────
    if not fcm_tokens:
        print("ℹ️  No FCM token — student hasn't enabled notifications yet.")
        return

    def build_message(token):
        return {
            "message": {
                "token": token,
                "data": {
                    "url": app_url,
                    "postId": post_id,
                    "contentUrl": posaula_url,
                    "title": "Novo pós-aula! 📚",
                    "body": f"Seu resumo de aula está pronto, {first_name}!",
                },
                "webpush": {
                    "headers": {
                        "Urgency": "high",
                    },
                    "data": {
                        "url": app_url,
                        "postId": post_id,
                        "title": "Novo pós-aula! 📚",
                        "body": f"Seu resumo de aula está pronto, {first_name}!",
                        "contentUrl": posaula_url,
                    },
                    "fcm_options": {
                        "link": app_url,
                    },
                },
            }
        }

    success_count = 0
    for token in fcm_tokens:
        resp = requests.post(
            f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send",
            headers=headers,
            json=build_message(token),
        )

        if resp.status_code == 200:
            success_count += 1
            print(f"✅ Push notification sent to {first_name}")
        else:
            print(f"❌ FCM error: {resp.status_code}")
            try:
                err = resp.json()
                print(f"   code:    {err.get('error', {}).get('code')}")
                print(f"   status:  {err.get('error', {}).get('status')}")
                print(f"   message: {err.get('error', {}).get('message')}")
            except Exception:
                print(f"   raw: {resp.text}")

    print(f"Sent {success_count}/{len(fcm_tokens)} notification(s).")


if __name__ == "__main__":
    main()
