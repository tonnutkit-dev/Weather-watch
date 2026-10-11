import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowUp, ArrowUpRight, ChevronDown, ChevronUp, Crosshair, Droplets, Layers, MapPin, Moon, Play, Pause, Search, SlidersHorizontal, Sun, Wind, X, Info, ArrowLeft } from 'lucide-react';
import '@fontsource/noto-sans-thai/300.css';
import '@fontsource/noto-sans-thai/400.css';
import '@fontsource/noto-sans-thai/500.css';
import '@fontsource/noto-sans-thai/600.css';
import MapScene from './MapScene';
import { demo, demoLocations, directions, frameLabel, nextFrame, nextSheet } from './design';
import type { DemoLocation, Direction, Sheet, Theme } from './design';
import { BrandMark, ForecastChart, WeatherArt } from './Symbols';
import './styles.css';
function App() {
    const params = new URLSearchParams(location.search);
    const initial = params.get('direction');
    const direction: Direction = initial === 'a' || initial === 'b' ? initial : 'c';
    const [appearance, setAppearance] = useState(params.get('theme') || localStorage.getItem('ww:exploration:appearance') || 'system');
    const [systemDark, setSystemDark] = useState(matchMedia('(prefers-color-scheme: dark)').matches);
    const theme: Theme = appearance === 'dark' || (appearance === 'system' && systemDark) ? 'dark' : 'light';
    const [sheet, setSheet] = useState<Sheet>('collapsed');
    const [dialog, setDialog] = useState<'location' | 'settings' | 'radar' | 'layers' | null>(null);
    const [selected, setSelected] = useState<DemoLocation>(demoLocations[0]);
    const [layers, setLayers] = useState(false), [rain, setRain] = useState(true), [recenter, setRecenter] = useState(0);
    const [frame, setFrame] = useState(2), [playing, setPlaying] = useState(false);
    const [query, setQuery] = useState('');
    const [forecastTab, setForecastTab] = useState<'hourly' | 'daily'>('hourly');
    const modal = useRef<HTMLDialogElement>(null), previousFocus = useRef<HTMLElement | null>(null), dragStart = useRef<number | null>(null);
    const sheetScroll = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const mq = matchMedia('(prefers-color-scheme: dark)');
        const change = () => setSystemDark(mq.matches);
        mq.addEventListener('change', change);
        return () => mq.removeEventListener('change', change);
    }, []);
    useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
    useEffect(() => {
        if (!playing || sheet !== 'collapsed')
            return;
        const id = setInterval(() => setFrame(nextFrame), 1000);
        return () => clearInterval(id);
    }, [playing, sheet]);
    useEffect(() => { if (sheet !== 'collapsed')
        setPlaying(false); sheetScroll.current?.scrollTo({ top: 0 }); }, [sheet]);
    useEffect(() => {
        if (dialog) {
            previousFocus.current = document.activeElement as HTMLElement;
            modal.current?.showModal();
        }
        else {
            modal.current?.close();
            previousFocus.current?.focus();
        }
    }, [dialog]);
    function preference(value: string) { setAppearance(value); localStorage.setItem('ww:exploration:appearance', value); const u = new URL(location.href); u.searchParams.set('theme', value); history.replaceState(null, '', u); }
    function open(value: 'location' | 'settings' | 'radar' | 'layers') { setLayers(false); setDialog(value); }
    const details = directions[direction];
    return <main className={`prototype direction-${direction} sheet-${sheet}`} data-direction={direction}>
    <header className="app-header">
      <a className="brand" href="./index.html" aria-label="Weather Watch กลับหน้าเปรียบเทียบ"><BrandMark /><span>Weather Watch<span className="brand-descriptor">THE WEATHER, CONSIDERED.</span></span></a>
      <span className="desktop-edition">{details.name}<span>DESIGN STUDY · 01</span></span>
      <div className="header-actions"><button className="icon-button" aria-label="เลือกสถานที่" onClick={() => open('location')}><Search /></button><button className="icon-button" aria-label="การแสดงผล" onClick={() => open('settings')}>{theme === 'light' ? <SlidersHorizontal /> : <Moon />}</button></div>
    </header>
    <div className="study-notice"><span className="study-dot"/><span>ต้นแบบดีไซน์ {details.label} · ข้อมูลอากาศและฝนเป็นตัวอย่าง</span><a href="./index.html" aria-label="เปรียบเทียบทั้งสามดีไซน์"><ArrowUpRight size={14}/></a></div>
    <div className="composition">
      <section className="weather-overview" aria-label="ภาพรวมอากาศตัวอย่าง">
        <div className="editorial-meta"><span>WEATHER / 01</span><span>{demo.date}</span></div>
        <button className="location-heading" onClick={() => open('location')}><MapPin size={15}/><h1>{selected.name}</h1><ChevronDown size={15}/></button>
        <p className="location-subtitle">{selected.country === 'TH' ? 'ประเทศไทย' : 'ประเทศจีน'}<span> · </span>อากาศในมุมมองของคุณ</p>
        <div className="weather-hero"><div className="temperature" aria-label="31 องศาเซลเซียส ข้อมูลตัวอย่าง" data-testid="primary-temperature">{demo.temperature}<span>°</span></div><WeatherArt /></div>
        <div className="condition-line"><p>{demo.condition}</p><span>{demo.high}° <ArrowUp size={12}/> / {demo.low}° <ArrowDown size={12}/></span></div>
        <p className="feels-line">รู้สึกเหมือน {demo.feels}° <span>·</span> ตัวอย่างเพื่อประเมินดีไซน์</p>
        <div className="weather-metrics"><div><Droplets /><span>ความชื้น<strong>{demo.humidity}<small>%</small></strong></span></div><div><Wind /><span>ลมตะวันตกเฉียงใต้<strong>{demo.wind}<small> กม./ชม.</small></strong></span></div></div>
        <div className="editorial-note"><span className="section-index">THE NEXT HOURS</span><p>ช่วงบ่ายที่ค่อย ๆ เย็นลง</p><span>ตัวอย่างข้อความประกอบพยากรณ์<br />ยังไม่เชื่อมต่อข้อมูลสภาพอากาศจริง</span></div>
        <section className="desktop-forecast" aria-label="พยากรณ์ตัวอย่างบน desktop"><Forecast compact/></section>
        <div className="overview-bottom"><span>{selected.lat.toFixed(2)}° N / {selected.lon.toFixed(2)}° E<span>พิกัดสถานที่ที่เลือก</span></span><span className="edition-number">WW—01</span></div>
      </section>
      <section className="map-pane" aria-label="สำรวจพื้นที่">
        <MapScene direction={direction} theme={theme} location={selected} rain={rain} frame={frame} recenter={recenter}/>
        <div className="map-heading"><span className="section-index">THE WEATHER AROUND YOU</span><h2>อากาศรอบตัว</h2><span className="map-context">แผนที่จริง · ชั้นฝนตัวอย่าง</span></div>
        <div className="map-tools"><div className="layer-anchor"><button className="map-button" aria-label="ชั้นข้อมูล" aria-expanded={layers || dialog==='layers'} onClick={() => sheet==='collapsed' ? setLayers(!layers) : open('layers')}><Layers /></button>{layers && <div className="layer-popover"><h3>ชั้นข้อมูลบนแผนที่</h3><button aria-pressed={rain} onClick={() => setRain(!rain)}><Droplets size={17}/> ฝนตัวอย่าง <span>{rain ? 'เปิด' : 'ปิด'}</span></button><p>รูปพื้นที่ฝนเป็นภาพประกอบดีไซน์ ไม่ใช่เรดาร์จริง</p></div>}</div><button className="map-button" aria-label="กลับไปยังสถานที่ที่เลือก" onClick={() => setRecenter(n => n + 1)}><Crosshair /></button></div>
        
        <div className="map-data-note"><span>EXPLORATION {details.label}</span><p>สีฝนตัวอย่าง</p></div>
        <div className="radar-strip" aria-label="เครื่องเล่นภาพฝนตัวอย่าง">
          <button className="play-button" aria-label={playing ? 'หยุดภาพตัวอย่าง' : 'เล่นภาพตัวอย่าง'} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={18}/> : <Play size={18} fill="currentColor"/>}</button>
          <div className="radar-timeline"><div><span>เรดาร์ <span className="demo-inline">/ ตัวอย่าง</span></span><time>{frameLabel(frame)}</time></div><input type="range" min="0" max="2" step="1" value={frame} aria-label="เวลาเฟรมตัวอย่าง" onChange={e => { setFrame(Number(e.target.value)); setPlaying(false); }}/></div>
          <button className="icon-button" aria-label="รายละเอียดภาพฝนตัวอย่าง" onClick={() => open('radar')}><Info size={19}/></button>
        </div>
        
      </section>
      <section className="situation-sheet" aria-label="ข้อมูลประกอบอากาศตัวอย่าง">
        <div className="sheet-handle-row" onPointerDown={e => { if ((e.target as Element).closest('button'))
        return; dragStart.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerUp={e => { if (dragStart.current !== null) {
        const d = dragStart.current - e.clientY;
        if (Math.abs(d) > 28)
            setSheet(s => nextSheet(s, d > 0 ? 1 : -1));
        dragStart.current = null;
    } }}>
          <span className="sheet-handle"/><span className="sheet-heading">มองไปข้างหน้า</span><div><button className="sheet-button" aria-label="ยุบแผง" disabled={sheet === 'collapsed'} onClick={() => setSheet(s => nextSheet(s, -1))}><ChevronDown /></button><button className="sheet-button" aria-label="ขยายแผง" disabled={sheet === 'expanded'} onClick={() => setSheet(s => nextSheet(s, 1))}><ChevronUp /></button></div>
        </div>
        <div className="sheet-scroll" ref={sheetScroll}>
          <div className="situation-summary"><div><span className="section-index">A LITTLE PERSPECTIVE</span><h2>เมฆมากในช่วงบ่าย</h2><p>ข้อความตัวอย่าง · ยังไม่มีข้อสรุปจากข้อมูลจริง</p></div><div className="summary-glyph"><Wind size={24}/></div></div>
          <div className="detail-content">
            <nav className="forecast-tabs" aria-label="ช่วงพยากรณ์"><button aria-pressed={forecastTab === 'hourly'} onClick={() => setForecastTab('hourly')}>รายชั่วโมง</button><button aria-pressed={forecastTab === 'daily'} onClick={() => setForecastTab('daily')}>รายวัน</button><span>ข้อมูลตัวอย่าง</span></nav>
            {forecastTab === 'hourly' ? <Forecast /> : <div className="daily-list">{demo.days.map(day => <div key={day.label}><strong>{day.label}</strong><WeatherArt small rain/><span>{day.rain}%</span><span>{day.low}°<span className="day-bar"/>{day.high}°</span></div>)}</div>}
            <section className="air-card"><div><span className="section-index">AIR / AT THIS POINT</span><h3>AQI จุดนี้</h3><p>ตัวอย่างข้อมูลแบบจำลอง · US AQI</p></div><div className="aqi-value">{demo.usAqi}<span>ปานกลาง</span></div><div className="pm-row"><span>PM2.5 <strong>{demo.pm25} <small>µg/m³</small></strong></span><p>ไม่มีการแสดงผลเป็นแผนที่คุณภาพอากาศทั้งภูมิภาค</p></div></section>
            <section className="trust-note"><Info size={16}/><p>ต้นแบบนี้ใช้ข้อมูลตัวอย่างเพื่อเลือกทิศทางการออกแบบเท่านั้น แผนที่ใช้งานได้จริง ไม่มีข้อมูลสังเกตการณ์หรือประกาศทางการในหน้านี้</p></section>
          </div>
        </div>
      </section>
    </div>
    <dialog aria-labelledby="prototype-dialog-title" ref={modal} onCancel={() => setDialog(null)} className="modal">
      <div className="modal-header"><h2 id="prototype-dialog-title">{dialog === 'location' ? 'เลือกสถานที่' : dialog === 'settings' ? 'การแสดงผล' : dialog==='layers' ? 'ชั้นข้อมูล' : 'ภาพฝนตัวอย่าง'}</h2><button className="icon-button" aria-label="ปิด" onClick={() => setDialog(null)}><X /></button></div>
      {dialog === 'location' && <><label className="search-field"><Search size={18}/><input placeholder="ค้นหาสถานที่ในต้นแบบ" aria-label="ค้นหาสถานที่ในต้นแบบ" value={query} onChange={e => setQuery(e.target.value)}/></label><p className="modal-description">ต้นแบบเลือกได้ 5 เมืองเพื่อทดสอบ layout แอปจริงยังคงรองรับ 77 จังหวัดไทย</p><div className="location-results">{demoLocations.filter(l => l.name.includes(query)).map(l => <button key={l.name} onClick={() => { setSelected(l); setDialog(null); }}><MapPin size={18}/><span>{l.name}<small>{l.country === 'TH' ? 'ประเทศไทย' : 'จีน · ' + l.zone}</small></span><ArrowUpRight size={17}/></button>)}</div><p className="modal-description">เปลี่ยนพิกัดแผนที่จริง · ค่าอากาศยังเป็นตัวอย่างชุดเดียว</p></>}
      {dialog === 'settings' && <><p className="modal-description">เลือกโทนภาพสำหรับเปรียบเทียบดีไซน์</p><div className="theme-choices">{[{ value: 'system', label: 'ตามอุปกรณ์' }, { value: 'light', label: 'สว่าง' }, { value: 'dark', label: 'มืด' }].map(t => <button aria-pressed={appearance === t.value} key={t.value} onClick={() => preference(t.value)}>{t.value === 'dark' ? <Moon /> : t.value === 'light' ? <Sun /> : <SlidersHorizontal />}{t.label}</button>)}</div><a className="review-link" href="./index.html"><ArrowLeft size={17}/> กลับหน้าเปรียบเทียบ A / B / C</a></>}
      {dialog === 'layers' && <div className="layer-dialog"><button aria-pressed={rain} onClick={()=>setRain(!rain)}><Droplets size={18}/> ฝนตัวอย่าง <span>{rain?'เปิด':'ปิด'}</span></button><p className="modal-description">สีฝนเป็นภาพประกอบเพื่อประเมินดีไซน์ ไม่ใช่เรดาร์จริง</p></div>}
            {dialog === 'radar' && <><p className="modal-description">11 ตุลาคม 2569 · {frameLabel(frame)} น. (เวลาตัวอย่าง)</p><div className="radar-detail"><span className="section-index">VISUAL STUDY, NOT LIVE RADAR</span><h3>ดูการจัดวาง โดยไม่ปะปนกับข้อมูลจริง</h3><p>พื้นที่สีฟ้าเป็นรูปทรงประกอบที่สร้างในต้นแบบ ปุ่มเล่นเปลี่ยนเฉพาะความเข้มของภาพตัวอย่าง ไม่ใช่เรดาร์ย้อนหลังหรือ Nowcast</p><p>ระบบ RainViewer ของแอปเดิมไม่ได้ถูกแก้ไข การเลือกดีไซน์จะนำไปใช้กับเฟรมจริงและ timestamp เดิม</p><div className="demo-legend"><span />สีตัวอย่างอ่อน → เข้ม ไม่มีหน่วยความเข้มฝน</div></div></>}
    </dialog>
  </main>;
}
function Forecast({ compact = false }: {
    compact?: boolean;
}) {
    return <div className={`forecast-block ${compact ? 'compact' : ''}`}><div className="forecast-heading"><h3>ชั่วโมงถัดไป</h3><span>ตัวอย่าง · 6 ชั่วโมง</span></div><ForecastChart /><div className="hour-list">{demo.hours.map((hour, index) => <article className="hour" key={hour.time}><time>{hour.time}</time><WeatherArt small rain={hour.condition === 'rain'}/><strong>{hour.temperature}°</strong><span className="rain-chance"><Droplets size={10}/>{hour.rain}%</span>{index === 0 && <span className="current-hour-dot"/>}</article>)}</div></div>;
}
createRoot(document.getElementById('root')!).render(<App />);
