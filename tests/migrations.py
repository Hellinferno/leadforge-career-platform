import re
import sqlite3
from pathlib import Path

root=Path(__file__).resolve().parents[1]
con=sqlite3.connect(':memory:')
con.executescript((root/'drizzle/0000_curious_daimon_hellstrom.sql').read_text())
con.execute("INSERT INTO leads(id,owner_id,dedupe_key,company,stage,notes,created_at,updated_at) VALUES('legacy','owner-a','old','Legacy Co','meeting','retain my notes','now','now')")
con.execute("INSERT INTO profiles(owner_id,signature,offer) VALUES('owner-a','Ravi','Legacy profile data')")
con.executescript((root/'drizzle/0001_eager_texas_twister.sql').read_text())
assert con.execute("SELECT notes,stage,contact_type,linkedin_url FROM leads WHERE id='legacy'").fetchone()==('retain my notes','meeting','employee','')
assert con.execute("SELECT offer,signature,target_role FROM profiles WHERE owner_id='owner-a'").fetchone()==('Legacy profile data','Ravi','AI / Data Science internship')
con.executescript((root/'drizzle/0002_sticky_next_avengers.sql').read_text())
con.executescript((root/'drizzle/0003_steep_scarecrow.sql').read_text())
con.executescript((root/'drizzle/0004_busy_boomerang.sql').read_text())
con.executescript((root/'drizzle/0005_happy_charles_xavier.sql').read_text())
con.executescript((root/'drizzle/0006_big_marauders.sql').read_text())
con.executescript((root/'drizzle/0007_lame_shinobi_shaw.sql').read_text())
con.executescript((root/'drizzle/0008_resumes.sql').read_text())
assert con.execute("SELECT phone,email_source_url,phone_source_url,notes FROM leads WHERE id='legacy'").fetchone()==('','','','retain my notes')
source=(root/'app/api/workspace/route.ts').read_text()
fields=re.search(r'const fields=\{([^}]+)\}',source).group(1)
pairs=re.findall(r'(\w+):"([^"]+)"',fields)
columns=[column for _,column in pairs]
values={key:'' for key,_ in pairs};values.update(company='Acme',stage='new',sourceKind='manual',contactType='employee')
insert=f"INSERT INTO leads(id,owner_id,dedupe_key,{','.join(columns)},created_at,updated_at) SELECT {','.join('?' for _ in range(len(columns)+5))} WHERE NOT EXISTS(SELECT 1 FROM leads WHERE owner_id=? AND (dedupe_key=? OR (?!='' AND email=?) OR (?!='' AND linkedin_url=?))) ON CONFLICT(owner_id,dedupe_key) DO NOTHING"
def add(ident,owner,key,email='',linkedin=''):
    row={**values,'email':email,'linkedInUrl':linkedin}
    con.execute(insert,[ident,owner,key,*[row[k] for k,_ in pairs],'now','now',owner,key,email,email,linkedin,linkedin])
add('one','owner-a','email:hello@acme.com','hello@acme.com','https://www.linkedin.com/in/asha')
add('two','owner-a','linkedin:https://www.linkedin.com/in/asha','','https://www.linkedin.com/in/asha')
add('three','owner-a','email:hello@acme.com','hello@acme.com')
assert con.execute("SELECT COUNT(*) FROM leads WHERE company='Acme'").fetchone()[0]==1
add('four','owner-b','email:hello@acme.com','hello@acme.com','https://www.linkedin.com/in/asha')
assert con.execute("SELECT COUNT(*) FROM leads WHERE company='Acme'").fetchone()[0]==2
con.execute("UPDATE leads SET job_title=?,linkedin_url=? WHERE id=? AND owner_id=?",('ML Intern','https://www.linkedin.com/in/asha','one','owner-a'))
assert con.execute("SELECT job_title FROM leads WHERE id='one'").fetchone()[0]=='ML Intern'
con.execute("DELETE FROM leads WHERE id=? AND owner_id=?",('one','owner-b'))
assert con.execute("SELECT COUNT(*) FROM leads WHERE id='one'").fetchone()[0]==1
con.execute("INSERT INTO jobs(id,owner_id,dedupe_key,company,title,url,type,status,next_action_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",('job1','owner-a','url:job1','Acme','ML Intern','https://acme.com/jobs/1','internship','saved','2026-10-20','now','now'))
con.execute("UPDATE jobs SET status=? WHERE id=? AND owner_id=?",('interview','job1','owner-a'))
con.execute("DELETE FROM jobs WHERE id=? AND owner_id=?",('job1','owner-b'))
assert con.execute("SELECT status FROM jobs WHERE id='job1'").fetchone()[0]=='interview'
con.execute("UPDATE profiles SET education=?,evidence=?,resume_url=? WHERE owner_id=?",('BS student','My project','https://resume.example/ravi','owner-a'))
assert con.execute("SELECT evidence FROM profiles WHERE owner_id='owner-a'").fetchone()[0]=='My project'
assert con.execute("SELECT notes FROM leads WHERE id='legacy'").fetchone()[0]=='retain my notes'
draft_source=(root/'app/api/drafts/route.ts').read_text()
create_sql=re.search(r'prepare\("(INSERT INTO message_drafts[^"\n]+)"\)',draft_source).group(1)
update_sql=re.search(r"prepare\('(UPDATE message_drafts[^'\n]+)'\)",draft_source).group(1)
cleanup_sql=re.search(r'prepare\("(DELETE FROM message_drafts[^"\n]+)"\)',source).group(1)
def create_draft(ident,owner,contact_id,goal='referral',step=1,body='First draft'):
    return con.execute(create_sql,[ident,owner,contact_id,goal,step,'Subject',body,'now','now',contact_id,owner]).rowcount
assert create_draft('draft-one','owner-a','one')==1
assert create_draft('draft-duplicate','owner-a','one')==0
assert create_draft('draft-cross-owner','owner-b','one')==0
assert create_draft('draft-missing','owner-a','absent')==0
assert create_draft('draft-other-goal','owner-a','one','hiring')==1
assert create_draft('draft-other-owner','owner-b','four')==1
assert con.execute(update_sql,['Edited subject','Edited body','later','draft-one','owner-a',1]).rowcount==1
assert con.execute("SELECT body,version FROM message_drafts WHERE id='draft-one'").fetchone()==('Edited body',2)
assert con.execute(update_sql,['Stale edit','Stale body','later','draft-one','owner-a',1]).rowcount==0
assert con.execute(update_sql,['Wrong owner','Wrong owner body','later','draft-one','owner-b',2]).rowcount==0
assert con.execute("SELECT body,version FROM message_drafts WHERE id='draft-one'").fetchone()==('Edited body',2)
con.execute(cleanup_sql,['one','owner-b'])
assert con.execute("SELECT COUNT(*) FROM message_drafts WHERE contact_id='one'").fetchone()[0]==2
with con:
    con.execute(cleanup_sql,['one','owner-a'])
    con.execute('DELETE FROM leads WHERE id=? AND owner_id=?',['one','owner-a'])
assert con.execute("SELECT COUNT(*) FROM message_drafts WHERE contact_id='one'").fetchone()[0]==0
assert con.execute("SELECT COUNT(*) FROM message_drafts WHERE contact_id='four'").fetchone()[0]==1
assert con.execute("SELECT body,version FROM message_drafts WHERE id='draft-other-owner'").fetchone()==('First draft',1)
assert con.execute("SELECT notes FROM leads WHERE id='legacy'").fetchone()[0]=='retain my notes'
activity_source=(root/'app/api/activity/route.ts').read_text()
activity_insert=re.search(r'prepare\("(INSERT INTO activity_entries[^"\n]+)"\)',activity_source).group(1)
activity_update=re.search(r'prepare\("(UPDATE leads SET stage=CASE[^"\n]+)"\)',activity_source).group(1)
activity_delete=re.search(r"prepare\('(DELETE FROM activity_entries[^'\n]+)'\)",activity_source).group(1)
activity_cleanup=re.search(r'prepare\("(DELETE FROM activity_entries[^"\n]+)"\)',source).group(1)
add('journal-contact','owner-a','journal-contact')
con.execute("UPDATE leads SET next_action_at='2026-10-13',updated_at='version-one' WHERE id='journal-contact'")
con.commit()
def log_activity(ident,request_id,owner='owner-a',contact='journal-contact',expected='version-one',stage='contacted',follow='2026-10-19',outbound=1,created='version-two'):
    changes=int(stage!='' or follow is not None)
    with con:
        inserted=con.execute(activity_insert,[ident,owner,contact,request_id,'connection_sent','linkedin','2026-10-12','Private notes','Actual message',stage,follow,created,contact,owner,changes,expected,outbound]).rowcount
        updated=con.execute(activity_update,[stage,stage,follow,follow,created,contact,owner,changes,ident,owner]).rowcount
    return inserted,updated
assert log_activity('event-one','request-one')==(1,1)
assert con.execute("SELECT stage,next_action_at,updated_at FROM leads WHERE id='journal-contact'").fetchone()==('contacted','2026-10-19','version-two')
# A retry uses a new generated event UUID but the same request ID; it must not replay a stage change.
assert log_activity('event-retry','request-one',expected='version-two',stage='offer',created='version-three')==(0,0)
assert con.execute("SELECT stage,updated_at FROM leads WHERE id='journal-contact'").fetchone()==('contacted','version-two')
assert con.execute("SELECT COUNT(*) FROM activity_entries WHERE request_id='request-one'").fetchone()[0]==1
assert log_activity('event-stale','request-stale',expected='version-one')==(0,0)
assert log_activity('event-wrong-owner','request-wrong-owner',owner='owner-b',expected='version-two')==(0,0)
assert log_activity('event-missing','request-missing',contact='missing')==(0,0)
# Keep stage and follow-up date while recording a note even if the contact version has changed.
assert log_activity('event-note','request-note',expected='old-version',stage='',follow=None,outbound=0)==(1,0)
assert con.execute("SELECT stage,next_action_at,updated_at FROM leads WHERE id='journal-contact'").fetchone()==('contacted','2026-10-19','version-two')
assert log_activity('event-clear','request-clear',expected='version-two',stage='',follow='',outbound=0,created='version-three')==(1,1)
assert con.execute("SELECT next_action_at FROM leads WHERE id='journal-contact'").fetchone()[0]==''
con.execute("UPDATE leads SET stage='do_not_contact',updated_at='version-four' WHERE id='journal-contact'")
con.commit()
assert log_activity('event-blocked','request-blocked',expected='version-four',stage='',follow=None)==(0,0)
assert con.execute(activity_delete,['event-one','owner-b']).rowcount==0
assert con.execute(activity_delete,['event-one','owner-a']).rowcount==1
assert con.execute("SELECT stage,updated_at FROM leads WHERE id='journal-contact'").fetchone()==('do_not_contact','version-four')
assert create_draft('journal-draft','owner-a','journal-contact')==1
assert log_activity('other-owner-log','request-note',owner='owner-b',contact='four',stage='',follow=None,outbound=0)==(1,0)
with con:
    con.execute(cleanup_sql,['journal-contact','owner-a'])
    con.execute(activity_cleanup,['journal-contact','owner-a'])
    con.execute('DELETE FROM leads WHERE id=? AND owner_id=?',['journal-contact','owner-a'])
assert con.execute("SELECT COUNT(*) FROM activity_entries WHERE contact_id='journal-contact'").fetchone()[0]==0
assert con.execute("SELECT COUNT(*) FROM message_drafts WHERE contact_id='journal-contact'").fetchone()[0]==0
assert con.execute("SELECT COUNT(*) FROM activity_entries WHERE contact_id='four'").fetchone()[0]==1
assert con.execute("SELECT COUNT(*) FROM message_drafts WHERE contact_id='four'").fetchone()[0]==1
assert con.execute("SELECT notes FROM leads WHERE id='legacy'").fetchone()[0]=='retain my notes'
assert con.execute("SELECT COUNT(*) FROM activity_entries WHERE contact_id='four'").fetchone()[0]==1
assert con.execute("SELECT COUNT(*) FROM message_drafts WHERE contact_id='four'").fetchone()[0]==1
people_source=(root/'app/api/scrape/route.ts').read_text()
reserve_sql=re.search(r'prepare\("(INSERT INTO people_search_limits[^"\n]+)"\)',people_source).group(1)
cache_write=re.search(r"prepare\('(INSERT INTO people_search_cache[^'\n]+)'\)",people_source).group(1)
cache_read=re.search(r"prepare\('(SELECT page_json FROM people_search_cache[^'\n]+)'\)",people_source).group(1)
cache_cleanup=re.search(r"prepare\('(DELETE FROM people_search_cache[^'\n]+)'\)",people_source).group(1)
def reserve(owner,now,day='2026-10-12',month='2026-10'):
    return con.execute(reserve_sql,[owner,day,month,now+15000,now]).rowcount
assert reserve('search-owner',0)==1
assert reserve('search-owner',1000)==0
assert reserve('search-other',1000)==1
for i in range(1,100):
    assert reserve('search-owner',i*15000)==1
assert reserve('search-owner',100*15000)==0
assert con.execute("SELECT day_count,month_count FROM people_search_limits WHERE owner_id='search-owner'").fetchone()==(100,100)
assert reserve('search-owner',1510000,day='2026-10-13')==1
assert con.execute("SELECT day_count,month_count FROM people_search_limits WHERE owner_id='search-owner'").fetchone()==(1,101)
con.execute("UPDATE people_search_limits SET month_count=250 WHERE owner_id='search-owner'")
assert reserve('search-owner',1540000,day='2026-10-14')==1
assert reserve('search-owner',1570000,day='2026-11-01',month='2026-11')==1
assert con.execute("SELECT day_count,month_count FROM people_search_limits WHERE owner_id='search-owner'").fetchone()==(1,1)
con.execute(cache_write,['search-owner','same-query','Owner A public results',3600000])
con.execute(cache_write,['search-other','same-query','Owner B public results',3600000])
assert con.execute(cache_read,['search-owner','same-query',100]).fetchone()[0]=='Owner A public results'
assert con.execute(cache_read,['search-other','same-query',100]).fetchone()[0]=='Owner B public results'
assert con.execute(cache_read,['third-owner','same-query',100]).fetchone() is None
assert con.execute(cache_read,['search-owner','same-query',3600000]).fetchone() is None
con.execute(cache_cleanup,['search-owner',3600000])
assert con.execute("SELECT COUNT(*) FROM people_search_cache WHERE owner_id='search-other'").fetchone()[0]==1
con.execute("UPDATE leads SET phone=?,email_source_url=?,phone_source_url=? WHERE id=? AND owner_id=?",('+91 98765 43210','https://acme.com/contact','https://acme.com/team','four','owner-b'))
assert con.execute("SELECT phone,email_source_url,phone_source_url FROM leads WHERE id='four'").fetchone()==('+91 98765 43210','https://acme.com/contact','https://acme.com/team')
print('PASS: additive migrations, phone/source persistence, owner isolation, drafts, outreach transactions, crawler cache expiry and atomic run limits verified.')

# Execute the actual network route SQL to check per-owner uniqueness and atomic linking.
network_source=(root/'app/api/network/route.ts').read_text()
network_queries=re.findall(r"prepare\('([^']+)'\)",network_source)
def query(prefix):
    return next(q for q in network_queries if q.startswith(prefix))
insert_network=query('INSERT INTO network_people')
con.execute(insert_network,('net-li','owner-a','linkedin:asha','{"name":"Asha","identities":["linkedin:asha"]}','now','now'))
con.execute(insert_network,('net-ig','owner-a','instagram:asha','{"name":"asha","identities":["instagram:asha"]}','now','now'))
con.execute(insert_network,('net-other','owner-b','linkedin:asha','{"name":"Private"}','now','now'))
con.execute(insert_network,('net-duplicate','owner-a','linkedin:asha','{}','now','now'))
assert con.execute('SELECT COUNT(*) FROM network_people').fetchone()[0]==3
read_network=query('SELECT id,data_json,version,created_at,updated_at FROM network_people WHERE owner_id=')
assert len(con.execute(read_network,('owner-a',)).fetchall())==2
update_network=next(q for q in network_queries if q.startswith('UPDATE network_people') and 'EXISTS' not in q)
assert con.execute(update_network,('{}','later','net-li','owner-b',1)).rowcount==0
assert con.execute(update_network,('{}','later','net-li','owner-a',99)).rowcount==0
merge_update=next(q for q in network_queries if q.startswith('UPDATE network_people') and 'EXISTS' in q)
merge_delete=next(q for q in network_queries if q.startswith('DELETE FROM network_people') and 'EXISTS' in q)
merged='{"name":"Asha","identities":["linkedin:asha","instagram:asha"]}'
# A stale second record does not update the first or delete the second.
with con:
    assert con.execute(merge_update,(merged,'later','net-li','owner-a',1,'net-ig','owner-a',9)).rowcount==0
    assert con.execute(merge_delete,('net-ig','owner-a',9,'net-li','owner-a',2,merged,'later')).rowcount==0
assert con.execute('SELECT version FROM network_people WHERE id=?',('net-li',)).fetchone()==(1,)
with con:
    assert con.execute(merge_update,(merged,'later','net-li','owner-a',1,'net-ig','owner-a',1)).rowcount==1
    assert con.execute(merge_delete,('net-ig','owner-a',1,'net-li','owner-a',2,merged,'later')).rowcount==1
assert con.execute('SELECT data_json,version FROM network_people WHERE id=?',('net-li',)).fetchone()==(merged,2)
assert con.execute('SELECT COUNT(*) FROM network_people WHERE owner_id=?',('owner-b',)).fetchone()==(1,)
print('Network migration, owner isolation, duplicate imports and atomic versioned profile linking: PASS')

# Personal-login throttles are atomic and independent of career records.
rate_source=(root/'lib/auth-rate.ts').read_text()
rate_sql=re.search(r"reserveLoginSql='([^']+)'",rate_source).group(1)
for attempt in range(10):
    assert con.execute(rate_sql,('ip-hash',100,1000)).rowcount==1
assert con.execute(rate_sql,('ip-hash',100,1000)).rowcount==0
assert con.execute(rate_sql,('different-ip-hash',100,1000)).rowcount==1
assert con.execute(rate_sql,('ip-hash',101,2000)).rowcount==1
assert con.execute("SELECT attempts FROM auth_attempts WHERE key='ip-hash'").fetchone()==(1,)
assert con.execute("SELECT notes FROM leads WHERE id='legacy'").fetchone()==('retain my notes',)
con.execute("INSERT INTO resumes(id,owner_id,title,target_role,data_json,is_primary,created_at,updated_at) VALUES('res-1','owner-a','Data Analyst','Data Analytics','{}',1,'now','now')")
assert con.execute("SELECT title,target_role,is_primary FROM resumes WHERE owner_id='owner-a'").fetchone()==('Data Analyst','Data Analytics',1)
assert con.execute("SELECT COUNT(*) FROM resumes WHERE owner_id='owner-b'").fetchone()[0]==0
print('Personal login migration and atomic throttling: PASS')
