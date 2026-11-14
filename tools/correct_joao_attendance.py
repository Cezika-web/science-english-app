#!/usr/bin/env python3
"""Targeted, conditional correction; dry-run unless --apply. Never creates or notifies."""
import argparse
import datetime
import json
import os
from pathlib import Path
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession

UID = 'VJTv85GGCNMEC95rsk78wlaz66C3'
PEDRO = 'jy7jasNf5fVVsUZFdGYX6dCALRZ2'
POST = 'pos-aula-joao-tondato-11-13-2026'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--backup-dir', type=Path, default=Path('backup-dados/attendance-2026-11-13'))
    args = parser.parse_args()
    creds = service_account.Credentials.from_service_account_file(
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'], scopes=['https://www.googleapis.com/auth/datastore'])
    if creds.project_id != 'scienceenglish':
        raise ValueError('Wrong Firebase project')
    session = AuthorizedSession(creds)
    base = 'https://firestore.googleapis.com/v1/projects/scienceenglish/databases/(default)/documents'

    def get(path):
        r = session.get(f'{base}/{path}')
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()

    path = f'students/{UID}/posaulas/{POST}'
    profile = get(f'students/{UID}')
    if profile['fields']['slug']['stringValue'] != 'joao-tondato':
        raise ValueError('Student mismatch')
    before = get(path)
    if before is None:
        print('Not published: no document created, no notification sent.')
        return
    fields = before['fields']
    if fields['filename']['stringValue'] != POST+'.html':
        raise ValueError('Filename mismatch')
    if not fields['classDate']['timestampValue'].startswith('2026-11-13T12:00:00'):
        raise ValueError('Date mismatch')
    if '8UYs0t49hPI' not in fields.get('html',{}).get('stringValue',''):
        raise ValueError('Recording mismatch')
    pedro_path = f'students/{PEDRO}/posaulas/pos-aula-pedro-henrique-11-13-2026'
    pedro = get(pedro_path)
    args.backup_dir.mkdir(parents=True,exist_ok=True)
    # A unique backup never overwrites the original before an idempotent rerun.
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    (args.backup_dir/f'before-{stamp}.json').write_text(json.dumps(before,ensure_ascii=False),encoding='utf-8')
    print('Verified exact João document, date, filename and recording. Pedro snapshot saved in memory.')
    print('Legacy attendancePresentDates for date:', '2026-11-13' in str(profile['fields'].get('attendancePresentDates',{})))
    if not args.apply:
        print('Dry-run only. Use --apply to set absent/manual and delete talkTime/studentTalkPct.')
        return
    patch = {
        'attendanceStatus': {'stringValue':'absent'},
        'attendanceSource': {'stringValue':'manual'},
        'attendanceUpdatedAt': {'timestampValue':datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z')},
    }
    mask = list(patch)+['talkTime','studentTalkPct']
    response = session.patch(f'{base}/{path}', params=[('updateMask.fieldPaths',k) for k in mask]+[
        ('currentDocument.updateTime',before['updateTime'])],json={'fields':patch})
    response.raise_for_status()
    after = get(path)
    assert after['fields']['attendanceStatus']['stringValue'] == 'absent'
    assert after['fields']['attendanceSource']['stringValue'] == 'manual'
    assert 'talkTime' not in after['fields'] and 'studentTalkPct' not in after['fields']
    untouched = lambda f: {k:v for k,v in f.items() if k not in mask}
    assert untouched(fields) == untouched(after['fields']), 'Unrelated post data changed'
    assert get(f'students/{UID}') == profile, 'Profile changed'
    assert get(pedro_path) == pedro, 'Pedro changed'
    print('APPLIED AND VERIFIED: absent/manual; HTML, study history and profile unchanged; Pedro document unchanged.')


if __name__ == '__main__':
    main()
