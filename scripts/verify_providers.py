"""Bounded read-only integration checks; evidence never used by the live UI."""
import json, pathlib, time, urllib.request, urllib.parse, concurrent.futures, datetime
OUT=pathlib.Path('evidence'); OUT.mkdir(exist_ok=True)
CURRENT='temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl'
HOURLY='temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m'
DAILY='weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max'
places={'bangkok':(13.7563,100.5018,'Asia/Bangkok'),'chiang-mai':(18.7883,98.9853,'Asia/Bangkok'),'phuket':(7.8804,98.3923,'Asia/Bangkok'),'xian':(34.2658,108.9541,'Asia/Shanghai'),'chengdu':(30.5728,104.0668,'Asia/Shanghai'),'chongqing':(29.563,106.5516,'Asia/Shanghai')}
checks={}
for name,(lat,lon,tz) in places.items():
    base={'latitude':lat,'longitude':lon,'timezone':tz,'timeformat':'unixtime'}
    checks['weather-'+name]='https://api.open-meteo.com/v1/forecast?'+urllib.parse.urlencode(dict(base,current=CURRENT,hourly=HOURLY,daily=DAILY,forecast_days=16))
    checks['air-'+name]='https://air-quality-api.open-meteo.com/v1/air-quality?'+urllib.parse.urlencode(dict(base,current='pm2_5,pm10,us_aqi',hourly='pm2_5,pm10,us_aqi',forecast_days=5,domains='cams_global'))
checks.update({'radar':'https://api.rainviewer.com/public/weather-maps.json','map-light':'https://tiles.openfreemap.org/styles/positron','map-dark':'https://tiles.openfreemap.org/styles/dark','geocode-thai':'https://geocoding-api.open-meteo.com/v1/search?name='+urllib.parse.quote('เชียงใหม่')+'&countryCode=TH&language=th&count=10','geocode-district':'https://geocoding-api.open-meteo.com/v1/search?name=Bang+Lamung&countryCode=TH&language=th&count=10','flood-discharge':'https://flood-api.open-meteo.com/v1/flood?latitude=13.7563&longitude=100.5018&daily=river_discharge&forecast_days=7','gistda-public':'https://disaster.gistda.or.th/','thaiwater-public':'https://www.thaiwater.net/','tmd-docs':'https://data.tmd.go.th/api/index1.php'})
def get(item):
    name,url=item; start=time.monotonic(); row={'id':name,'url':url,'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'WeatherWatch-PrototypeAudit/0.1'})
        with urllib.request.urlopen(req,timeout=25) as resp:
            body=resp.read(); row.update(httpStatus=resp.status,bytes=len(body),contentType=resp.headers.get('Content-Type'),cors=resp.headers.get('Access-Control-Allow-Origin'))
        ext='json' if 'json' in row['contentType'] else 'html' if 'html' in row['contentType'] else 'bin'
        (OUT/(name+'.'+ext)).write_bytes(body)
        if ext=='json':
            data=json.loads(body); row['keys']=list(data)
            if 'current' in data: row['currentTime']=data['current'].get('time');row['currentNulls']=[k for k,v in data['current'].items() if v is None]
            if 'daily' in data:row['days']=len(data['daily']['time'])
            if 'results' in data:row['results']=len(data['results'])
        row['result']='VERIFIED' if row['httpStatus']==200 else 'BLOCKED'
    except Exception as ex: row.update(result='BLOCKED',error=str(ex))
    row['durationSeconds']=round(time.monotonic()-start,2);return row
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: rows=list(pool.map(get,checks.items()))
rad=OUT/'radar.json'
if rad.exists():
    radar=json.loads(rad.read_text()); past=radar.get('radar',{}).get('past',[])
    if past:
        host=radar['host']; path=past[-1]['path']; rows.append(get(('radar-tile-bangkok',host+path+'/256/6/13.7563/100.5018/2/1_0.png')));rows.append(get(('radar-coverage-bangkok',host+'/v2/coverage/0/256/6/13.7563/100.5018/0/0_0.png')))
        rows.append({'id':'radar-frame-summary','frames':len(past),'first':past[0]['time'],'latest':past[-1]['time'],'generated':radar['generated'],'ageSeconds':int(time.time()-past[-1]['time']),'nowcastKeysPresent':'nowcast' in radar.get('radar',{})})
(OUT/'provider-results.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False))
for row in rows:print(row['id'],row.get('result','INFO'),row.get('httpStatus'),row.get('days',''),row.get('error',''))
