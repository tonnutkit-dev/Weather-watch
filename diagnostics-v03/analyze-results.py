from pathlib import Path
import json, csv, statistics, collections, re

import argparse
parser=argparse.ArgumentParser()
parser.add_argument('raw',type=Path)
parser.add_argument('output',type=Path)
args=parser.parse_args()
raw=args.raw
root=args.output
root.mkdir(parents=True,exist_ok=True)
data=json.loads((raw/'results.json').read_text())
env=json.loads((raw/'environment.json').read_text())
def stats(values):
    values=[v for v in values if isinstance(v,(int,float))]
    return {'n':len(values),'median':statistics.median(values) if values else None,'min':min(values) if values else None,'max':max(values) if values else None}
groups=collections.defaultdict(list)
for row in data['loads']:groups[(row['profile'],row['cache'])].append(row)
loads=[]
for (profile,cache),rows in groups.items():
    d={'profile':profile,'cache':cache,'runs':len(rows)}
    for key in ['FCP','LCP','CLS','windowedBlockingMs','longTaskCount','transferredBytes','jsTransferBytes','requestCount','cacheHits','weatherVisibleMs','mapReadyMs']:d[key]=stats([r.get(key) for r in rows])
    d['weatherVisibleWithinWindow']=sum(bool(re.search(r'\d',r['initialState'].get('temperature') or '')) for r in rows)
    d['mapReadyWithinWindow']=sum(r['initialState']['status']=='ready' for r in rows)
    d['pageErrors']=sum(any(e['kind']=='page' for e in r['errors']) for r in rows)
    loads.append(d)
network=json.loads((raw/'all-network.json').read_text())
def maxrolling(rows,span=60):
    rows=sorted([r for r in rows if isinstance(r.get('wallTime'),(float,int))],key=lambda r:r['wallTime']);j=0;best=0
    for i,r in enumerate(rows):
        while rows[j]['wallTime']<=r['wallTime']-span:j+=1
        best=max(best,i-j+1)
    return best
radar=[r for r in network if r['group']=='radar-tile']
per_session=[]
for p in raw.glob('*-raw.json'):
    r=json.loads(p.read_text());n=r.get('network',[]);rad=[v for v in n if v.get('group')=='radar-tile']
    per_session.append({'file':p.name,'requests':len(rad),'maxRolling60s':maxrolling(rad),'successful':sum(200<=v.get('status',0)<300 and not v.get('error') for v in rad),'failed':sum(bool(v.get('error')) or v.get('status',0)>=400 for v in rad),'browserCacheHits':sum(v.get('servedFromCache',False) or v.get('fromDiskCache',False) for v in rad),'repeatedURLs':len(rad)-len(set(v['url'] for v in rad))})
truth=[]
for p in sorted(raw.glob('radar-truth-*.json')):
    d=json.loads(p.read_text());obs=d.get('observer',{});requests=obs.get('frameRequests',[]);renders=[e for e in obs.get('mapEvents',[]) if e['kind']=='render-source-complete'];errors=[e for e in obs.get('mapEvents',[]) if e['kind']=='map-error']
    if not obs:continue
    rows=[]
    for q in requests:
        match=next((e for e in renders if e.get('requested')==q['time'] and e['at']>=q['at']),None)
        failures=[e for e in errors if e['at']>=q['at'] and (not match or e['at']<=match['at']) and e.get('sourceId')=='ww-radar']
        rows.append({'requestedFrame':q['time'],'labelAtMs':q['at'],'sourceCompleteCandidateAtMs':match['at'] if match else None,'gapMs':match['at']-q['at'] if match else None,'radarErrorsBeforeCandidate':len(failures),'candidateIsPixelProof':False})
    truth.append({'file':p.name,'frames':rows,'renderCandidates':len(renders),'radarErrors':len(errors)})
sustain=data.get('sustained')
memory=None
if sustain:
    samples=sustain['samples'];a=samples[0]['afterGC'];b=samples[-1]['afterGC'];last=samples[-5:]
    memory={'elapsedMs':sustain['elapsedMs'],'samples':len(samples),'heapFirstBytes':a['performance']['JSHeapUsedSize'],'heapLastBytes':b['performance']['JSHeapUsedSize'],'heapDeltaBytes':b['performance']['JSHeapUsedSize']-a['performance']['JSHeapUsedSize'],'lastFiveHeapBytes':[s['afterGC']['performance']['JSHeapUsedSize'] for s in last],'nodesFirst':a['dom']['nodes'],'nodesLast':b['dom']['nodes'],'listenersFirst':a['dom']['jsEventListeners'],'listenersLast':b['dom']['jsEventListeners'],'canvasFirst':a['canvasCount'],'canvasLast':b['canvasCount'],'mapInstancesLast':b['mapInstances'],'networkRequestsLast':samples[-1]['networkRequests'],'radarRequestsLast':samples[-1]['radarRequests'],'frameTotals':sustain.get('frameTotals'),'note':'Mixed workload and bounded telemetry; post-GC JS heap and DOM are not GPU-memory or leak proof.'}
summary={'environment':env,'loadProfiles':loads,'network':{'totalRequests':len(network),'radarRequests':len(radar),'radarMaxRolling60sAcrossTestContexts':maxrolling(radar),'perSession':per_session,'byGroup':dict(collections.Counter(r['group'] for r in network))},'radarTruth':truth,'memory':memory,'reliability':data['reliability'],'interactions':data['interactions'],'stages':data['stages'],'infrastructureFailures':data['failures'],'INP':None,'physicalIphone':False}
(root/'measurement-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
rows=[]
for r in data['loads']:
    rows.append({k:r.get(k) for k in ['profile','run','cache','FCP','LCP','CLS','windowedBlockingMs','longTaskCount','transferredBytes','jsTransferBytes','requestCount','cacheHits','weatherVisibleMs','mapReadyMs']})
with (root/'load-samples.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=rows[0].keys(),lineterminator="\n");w.writeheader();w.writerows(rows)
print(json.dumps({'loads':len(data['loads']),'reliabilityCases':len(data['reliability']),'sustained':memory,'failures':[f['stage'] for f in data['failures']]},indent=2))
