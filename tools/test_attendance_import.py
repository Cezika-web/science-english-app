import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
from types import SimpleNamespace
from contextlib import redirect_stdout
import io
import json
import os
import tempfile

source = Path(__file__).resolve().parents[1]/'.github/scripts/notify_student.py'
spec = importlib.util.spec_from_file_location('notify_student',source)
notify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(notify)
s = lambda value: {'stringValue':value}


class AttendanceImportTests(unittest.TestCase):
    def existing(self, status='absent', origin='manual'):
        return {'updateTime':'2026-11-14T12:00:00Z','fields':{
            'attendanceStatus':s(status),'attendanceSource':s(origin),'readAt':s('read'),
            'studyHistory':s('keep'),'talkTime':{'mapValue':{'fields':{}}}}}

    def fields(self):
        return {'html':s('new content'),'readAt':{'nullValue':None},'publishedAt':s('new'),
                'talkTime':{'mapValue':{'fields':{'studentPct':{'doubleValue':23}}}}}

    def test_reads_only_valid_explicit_head_marker(self):
        for status in ('absent','present'):
            self.assertEqual(notify.parse_attendance(f'<HEAD><meta content="{status}" name="czk-attendance"></HEAD>'),status)

    def test_old_html_and_free_text_do_not_define_attendance(self):
        for html in ('<head></head><p>Não compareceu</p>','<head></head><meta name="czk-attendance" content="absent">'):
            self.assertIsNone(notify.parse_attendance(html))

    def test_invalid_or_ambiguous_marker_fails(self):
        for content in ('unknown','ABSENT','','excused'):
            with self.assertRaises(ValueError):
                notify.parse_attendance(f'<head><meta name="czk-attendance" content="{content}"></head>')
        with self.assertRaises(ValueError):
            notify.parse_attendance('<head><meta name="czk-attendance" content="absent"><meta name="czk-attendance" content="present"></head>')

    def test_import_persists_marker_and_source(self):
        fields,params=notify.import_update(None,self.fields(),'absent')
        self.assertEqual(fields['attendanceStatus'],s('absent'))
        self.assertEqual(fields['attendanceSource'],s('html'))
        self.assertIn(('currentDocument.exists','false'),params)

    def test_manual_absence_survives_present_marker(self):
        fields,params=notify.import_update(self.existing(),self.fields(),'present')
        self.assertNotIn('attendanceStatus',fields)
        self.assertNotIn('talkTime',fields)
        self.assertIn(('updateMask.fieldPaths','talkTime'),params)
        self.assertIn(('updateMask.fieldPaths','studentTalkPct'),params)

    def test_manual_presence_survives_absent_marker(self):
        fields,_=notify.import_update(self.existing('present'),self.fields(),'absent')
        self.assertNotIn('attendanceStatus',fields)
        self.assertIn('talkTime',fields)

    def test_explicit_status_without_source_is_protected(self):
        previous=self.existing(); del previous['fields']['attendanceSource']
        fields,_=notify.import_update(previous,self.fields(),'present')
        self.assertNotIn('attendanceStatus',fields)
        self.assertNotIn('talkTime',fields)

    def test_imported_status_can_be_updated_from_marker(self):
        fields,_=notify.import_update(self.existing('present','html'),self.fields(),'absent')
        self.assertEqual(fields['attendanceStatus'],s('absent'))
        self.assertNotIn('talkTime',fields)

    def test_reimport_without_marker_keeps_previous_absence(self):
        fields,params=notify.import_update(self.existing('absent','html'),self.fields(),None)
        self.assertNotIn('attendanceStatus',fields)
        self.assertNotIn('talkTime',fields)
        self.assertNotIn(('updateMask.fieldPaths','attendanceStatus'),params)

    def test_reimport_preserves_read_and_other_study_history_and_uses_precondition(self):
        previous=self.existing()
        fields,params=notify.import_update(previous,self.fields(),'absent')
        self.assertNotIn('readAt',fields)
        for key in ('readAt','studyHistory','publishedAt'):
            self.assertNotIn(('updateMask.fieldPaths',key),params)
        self.assertIn(('currentDocument.updateTime',previous['updateTime']),params)

    def test_pedro_present_retains_oral_measurement(self):
        fields,_=notify.import_update(None,self.fields(),'present')
        self.assertEqual(fields['talkTime']['mapValue']['fields']['studentPct']['doubleValue'],23)

    def test_full_reimport_retries_concurrent_manual_correction_preserving_study(self):
        def response(status, data):
            return SimpleNamespace(status_code=status,ok=status<400,json=lambda:data,
                                   raise_for_status=lambda:None,text=json.dumps(data))
        previous=self.existing('present','html')
        corrected=self.existing('absent','manual')
        calls=[]
        def save(url,headers,params,json):
            calls.append((params,json))
            return response(412,{}) if len(calls)==1 else response(200,{})
        filename='pos-aula-student-11-13-2026.html'
        student={'document':{'name':'projects/test/databases/(default)/documents/students/student',
                             'fields':{'firstName':s('Student')}}}
        cwd=os.getcwd()
        with tempfile.TemporaryDirectory() as temp:
            try:
                os.chdir(temp)
                Path(filename).write_text('<head><meta name="czk-attendance" content="present"></head><h1>Study</h1>',encoding='utf-8')
                creds=SimpleNamespace(token='test-token',refresh=lambda request:None)
                with patch.dict(os.environ,{'FIREBASE_SERVICE_ACCOUNT':'{"project_id":"test"}'}), \
                     patch.object(notify.sys,'argv',['notify_student.py',filename]), \
                     patch.object(notify.service_account.Credentials,'from_service_account_info',return_value=creds), \
                     patch.object(notify.requests,'post',return_value=response(200,[student])) as post_request, \
                     patch.object(notify.requests,'get',side_effect=[response(200,previous),response(200,corrected)]), \
                     patch.object(notify.requests,'patch',side_effect=save), redirect_stdout(io.StringIO()):
                    notify.main()
                self.assertEqual(post_request.call_count,1,'only slug query; no notification without token')
                self.assertEqual(len(calls),2)
                params,payload=calls[-1]
                after=dict(corrected['fields'])
                for key,value in params:
                    if key=='updateMask.fieldPaths':
                        if value in payload['fields']: after[value]=payload['fields'][value]
                        else: after.pop(value,None)
                self.assertEqual(after['attendanceStatus'],s('absent'))
                self.assertEqual(after['attendanceSource'],s('manual'))
                self.assertEqual(after['readAt'],s('read'))
                self.assertEqual(after['studyHistory'],s('keep'))
                self.assertNotIn('talkTime',after)
            finally:
                os.chdir(cwd)


if __name__ == '__main__':
    unittest.main()
