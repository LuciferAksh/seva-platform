import os,sys,unittest,io
from pathlib import Path
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor
os.environ['APP_MODE']='demo';os.environ['GROQ_API_KEY']=''
sys.path.insert(0,str(Path('backend').resolve()))
from fastapi.testclient import TestClient
from app.main import app,limits
from app.store import store,Store
from app.repository import MemoryRepository
from app.seed import seed_demo
from app.extractor import extract_need
from app.services.intelligence import Intelligence
from PIL import Image

class SecurityFlows(unittest.TestCase):
 def setUp(self):
  repo=MemoryRepository();seed_demo(repo);store.repo=repo;limits.clear();self.client=TestClient(app)
  self.admin={'Authorization':'Bearer '+self.client.post('/api/demo/session',json={'role':'admin'}).json()['access_token']}
  self.vol={'Authorization':'Bearer '+self.client.post('/api/demo/session',json={'role':'volunteer'}).json()['access_token']}
 def photo(self):
  b=io.BytesIO();Image.new('RGB',(30,30),'green').save(b,format='PNG');return ('evidence.png',b.getvalue(),'image/png')
 def test_all_private_routes_require_token(self):
  for path in ['/api/dashboard','/api/needs','/api/volunteers','/api/assignments','/api/summary']:
   self.assertEqual(self.client.get(path).status_code,401,path)
 def test_volunteer_cannot_read_directory_or_assign(self):
  self.assertEqual(self.client.get('/api/volunteers',headers=self.vol).status_code,403)
  self.assertEqual(self.client.post('/api/assignments',json={'need_id':'need-demo-1','volunteer_id':'vol-asha'},headers=self.vol).status_code,403)
  self.assertEqual(self.client.get('/api/dashboard',headers=self.vol).json()['needs'],[])
 def test_idempotent_intake_and_urgency(self):
  payload={'text':'Fire with trapped people at Chennai','source_type':'text','submission_id':str(uuid4()),'lat':'13.0','lng':'80.2'}
  a=self.client.post('/api/reports/upload',data=payload,headers=self.admin);b=self.client.post('/api/reports/upload',data=payload,headers=self.admin)
  self.assertEqual(a.status_code,200,a.text);self.assertEqual(a.json()['report']['id'],b.json()['report']['id'])
  self.assertGreaterEqual(a.json()['report']['extraction']['urgency_level'],8)
  self.assertIsNone(extract_need('Somewhere not known needs food').coordinates)
  self.assertEqual(extract_need('food',structured={'urgency_level':10}).urgency_level,10)
 def test_assignment_completion_and_review(self):
  r=self.client.post('/api/assignments',json={'need_id':'need-demo-1','volunteer_id':'vol-asha'},headers=self.admin);self.assertEqual(r.status_code,200,r.text)
  self.assertEqual(self.client.post('/api/assignments',json={'need_id':'need-demo-1','volunteer_id':'vol-rohan'},headers=self.admin).status_code,409)
  payload={'need_id':'need-demo-1','volunteer_id':'vol-asha','notes':'Synthetic QA evidence'}
  self.assertEqual(self.client.post('/api/completions',data=payload,headers=self.vol).status_code,422)
  r=self.client.post('/api/completions',data=payload,files={'file':self.photo()},headers=self.vol)
  self.assertEqual(r.status_code,200,r.text);self.assertEqual(r.json()['review_status'],'pending');self.assertIsNone(r.json()['verified_people'])
  self.assertEqual(store.get_need('need-demo-1').status,'pending_review')
  self.assertEqual(self.client.post('/api/completions/need-demo-1/review',json={'approved':True},headers=self.vol).status_code,403)
  self.assertEqual(self.client.post('/api/completions/need-demo-1/review',json={'approved':True},headers=self.admin).status_code,200)
  self.assertEqual(store.get_need('need-demo-1').status,'completed');self.assertEqual(store.summary().people_helped,0)
 def test_unassigned_or_other_volunteer_cannot_complete(self):
  r=self.client.post('/api/completions',data={'need_id':'need-demo-1','volunteer_id':'vol-asha'},files={'file':self.photo()},headers=self.vol)
  self.assertEqual(r.status_code,409)
  r=self.client.post('/api/completions',data={'need_id':'need-demo-1','volunteer_id':'vol-rohan'},files={'file':self.photo()},headers=self.vol)
  self.assertEqual(r.status_code,403)
 def test_invalid_photo_is_rejected(self):
  self.client.post('/api/assignments',json={'need_id':'need-demo-1','volunteer_id':'vol-asha'},headers=self.admin)
  r=self.client.post('/api/completions',data={'need_id':'need-demo-1','volunteer_id':'vol-asha'},files={'file':('fake.png',b'not an image','image/png')},headers=self.vol)
  self.assertEqual(r.status_code,415)
 def test_concurrent_dispatch_has_one_winner(self):
  def assign(vol):
   try:store.assign_need('need-demo-1',vol);return 200
   except Exception as e:return getattr(e,'status_code',500)
  with ThreadPoolExecutor(2) as pool:results=list(pool.map(assign,['vol-asha','vol-rohan']))
  self.assertEqual(sorted(results),[200,409]);self.assertEqual(len(store.list_assignments()),1)
 def test_token_tampering_is_rejected(self):
  token=self.admin['Authorization'];self.assertEqual(self.client.get('/api/me',headers={'Authorization':token[:-1]+('0' if token[-1]!='0' else '1')}).status_code,401)
 def test_media_is_not_public(self):
  self.assertEqual(self.client.get('/api/completions/need-demo-1/photo').status_code,401)

 def test_public_intake_is_receipt_only(self):
  payload={'text':'Need food for 4 people in Chennai','source_type':'text','submission_id':str(uuid4())}
  r=self.client.post('/api/public/reports/upload',data=payload)
  self.assertEqual(r.status_code,200,r.text);self.assertEqual(set(r.json()),{'reference','status'})
  duplicate=self.client.post('/api/public/reports/upload',data=payload)
  self.assertEqual(r.json()['reference'],duplicate.json()['reference'])
  self.assertEqual(self.client.get('/api/needs').status_code,401)
 def test_connected_public_intake_requires_bot_protection(self):
  from unittest.mock import patch
  from dataclasses import replace
  from app.main import settings
  with patch('app.main.settings',replace(settings,mode='connected',turnstile_secret='')):
   r=self.client.post('/api/public/reports/upload',data={'text':'Need water','source_type':'text','submission_id':str(uuid4())})
   self.assertEqual(r.status_code,503)
 def test_rejected_evidence_allows_resubmission(self):
  self.client.post('/api/assignments',json={'need_id':'need-demo-1','volunteer_id':'vol-asha'},headers=self.admin)
  payload={'need_id':'need-demo-1','volunteer_id':'vol-asha'}
  self.client.post('/api/completions',data=payload,files={'file':self.photo()},headers=self.vol)
  r=self.client.post('/api/completions/need-demo-1/review',json={'approved':False},headers=self.admin)
  self.assertEqual(r.status_code,200,r.text)
  r=self.client.post('/api/completions',data=payload,files={'file':self.photo()},headers=self.vol)
  self.assertEqual(r.status_code,200,r.text)
 def test_human_confirmed_count(self):
  self.client.post('/api/assignments',json={'need_id':'need-demo-1','volunteer_id':'vol-asha'},headers=self.admin)
  self.client.post('/api/completions',data={'need_id':'need-demo-1','volunteer_id':'vol-asha'},files={'file':self.photo()},headers=self.vol)
  r=self.client.post('/api/completions/need-demo-1/review',json={'approved':True,'confirmed_people':12},headers=self.admin)
  self.assertEqual(r.status_code,200,r.text);self.assertEqual(store.summary().people_helped,12)

 def test_oversized_body_is_rejected_early(self):
  response=self.client.post('/api/public/reports/upload',content=b'x',headers={'Content-Length':str(13*1024*1024)})
  self.assertEqual(response.status_code,413)

if __name__=='__main__':unittest.main(verbosity=2)
