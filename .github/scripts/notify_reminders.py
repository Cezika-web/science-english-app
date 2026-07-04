#!/usr/bin/env python3
"""
Lembretes automáticos (rodado por agendamento no GitHub Actions):
  - Pós-aula não lido: 24h depois, e de novo em 48h. Para quando o aluno lê.
  - Atividades não feitas: 48h depois, e de novo em 5 dias. Para quando faz/corrige.
Usa marcadores no Firestore para nunca repetir a mesma notificação.
"""

import json
import os
import re
import datetime
import requests
from google.oauth2 import service_account
import google.auth.transport.requests

APP_URL = "https://cezika-web.github.io/science-english-app/"


def get_auth():
    sa = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT"])
    pid = sa["project_id"]
    cred = service_account.Credentials.from_service_account_info(
        sa,
        scopes=[
            "https://www.googleapis.com/auth/datastore",
            "https://www.googleapis.com/auth/firebase.messaging",
        ],
    )
    cred.refresh(google.auth.transport.requests.Request())
    return cred.token, pid


def parse_ts(v):
    s = (v or {}).get("timestampValue")
    if not s:
        return None
    s = s.replace("Z", "+00:00")
    m = re.match(r"(.*\.\d{1,6})\d*(\+.*)$", s)
    if m:
        s = m.group(1) + m.group(2)
    try:
        return datetime.datetime.fromisoformat(s)
    except Exception:
        try:
            return datetime.datetime.strptime(s[:19], "%Y-%m-%dT%H:%M:%S").replace(
                tzinfo=datetime.timezone.utc
            )
        except Exception:
            return None


def list_collection(token, base, path):
    docs = []
    url = f"{base}/{path}?pageSize=300"
    while url:
        j = requests.get(url, headers={"Authorization": f"Bearer {token}"}).json()
        docs += j.get("documents", [])
        nxt = j.get("nextPageToken")
        url = f"{base}/{path}?pageSize=300&pageToken={nxt}" if nxt else None
    return docs


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


def send_push(token, pid, fcm_token, title, body):
    msg = {
        "message": {
            "token": fcm_token,
            "data": {"url": APP_URL, "title": title, "body": body},
            "webpush": {
                "headers": {"Urgency": "high"},
                "data": {"url": APP_URL, "title": title, "body": body},
                "fcm_options": {"link": APP_URL},
            },
        }
    }
    return requests.post(
        f"https://fcm.googleapis.com/v1/projects/{pid}/messages:send",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=msg,
    )


def patch_field(token, base, path, fields):
    mask = "&".join(f"updateMask.fieldPaths={k}" for k in fields.keys())
    url = f"{base}/{path}?{mask}"
    return requests.patch(
        url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"fields": fields},
    )


def main():
    token, pid = get_auth()
    base = (
        f"https://firestore.googleapis.com/v1/projects/{pid}"
        "/databases/(default)/documents"
    )
    now = datetime.datetime.now(datetime.timezone.utc)
    sent = 0

    students = list_collection(token, base, "students")
    for doc in students:
        fields = doc.get("fields", {})
        if fields.get("archived", {}).get("booleanValue", False):
            continue
        uid = doc["name"].split("/")[-1]
        first = fields.get("firstName", {}).get("stringValue", "Aluno")
        tokens = collect_tokens(fields)
        if not tokens:
            continue

        # ── Pós-aula não lido ────────────────────────────────────────────
        posaulas = list_collection(token, base, f"students/{uid}/posaulas")
        latest, latest_dt = None, None
        for p in posaulas:
            dt = parse_ts(p.get("fields", {}).get("createdAt", {}))
            if dt and (latest_dt is None or dt > latest_dt):
                latest, latest_dt = p, dt
        if latest and latest_dt:
            pf = latest["fields"]
            is_read = "timestampValue" in pf.get("readAt", {})
            if not is_read:
                age_h = (now - latest_dt).total_seconds() / 3600.0
                pdoc = latest["name"].split("/")[-1]
                if age_h >= 48 and not pf.get("rem48h", {}).get("booleanValue", False):
                    for t in tokens:
                        send_push(token, pid, t, "Ainda não leu o pós-aula 📚",
                                  f"{first}, seu pós-aula continua te esperando. Bora ler?")
                    patch_field(token, base, f"students/{uid}/posaulas/{pdoc}",
                                {"rem48h": {"booleanValue": True}})
                    sent += 1
                elif age_h >= 24 and not pf.get("rem24h", {}).get("booleanValue", False):
                    for t in tokens:
                        send_push(token, pid, t, "Você ainda não leu o pós-aula 📚",
                                  f"{first}, o resumo da sua última aula está pronto. Que tal agora?")
                    patch_field(token, base, f"students/{uid}/posaulas/{pdoc}",
                                {"rem24h": {"booleanValue": True}})
                    sent += 1

        # ── Atividades não feitas ────────────────────────────────────────
        acts = list_collection(token, base, f"students/{uid}/activities")
        pend = []
        for a in acts:
            af = a.get("fields", {})
            status = af.get("status", {}).get("stringValue", "")
            fin = af.get("finalizada", {}).get("booleanValue", False)
            if status != "corrected" and not fin:
                dt = parse_ts(af.get("createdAt", {}))
                if dt:
                    pend.append(dt)
        if pend:
            oldest = min(pend)
            age_h = (now - oldest).total_seconds() / 3600.0
            ref = oldest.isoformat()
            rem48 = fields.get("actRem48h", {}).get("stringValue", "")
            rem5d = fields.get("actRem5d", {}).get("stringValue", "")
            if age_h >= 120 and rem5d != ref:
                for t in tokens:
                    send_push(token, pid, t, "Atividades te esperando ✏️",
                              f"{first}, faz 5 dias e você ainda tem atividades pra fazer. Vamos lá?")
                patch_field(token, base, f"students/{uid}", {"actRem5d": {"stringValue": ref}})
                sent += 1
            elif age_h >= 48 and rem48 != ref:
                for t in tokens:
                    send_push(token, pid, t, "Você tem atividades pendentes ✏️",
                              f"{first}, que tal fazer suas atividades desta semana?")
                patch_field(token, base, f"students/{uid}", {"actRem48h": {"stringValue": ref}})
                sent += 1

    print(f"Lembretes enviados: {sent}")


if __name__ == "__main__":
    main()
