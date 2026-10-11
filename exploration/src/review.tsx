import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/noto-sans-thai/400.css';
import '@fontsource/noto-sans-thai/500.css';
import './review.css';
import { directions } from './design';
import type { Direction } from './design';
function Review() {
    const [theme, setTheme] = useState('light'), [size, setSize] = useState('mobile');
    return <main className="review"><header><span>WEATHER WATCH / DESIGN EXPLORATION</span><a href="https://tonnutkit-dev.github.io/Weather-watch/" target="_blank" rel="noreferrer">ดู UI ปัจจุบัน ↗</a></header><section className="review-intro"><span>OWNER REVIEW · 11 OCT 2026</span><h1>อากาศที่มีมุมมอง.</h1><p>สามทิศทางใหม่ของ Weather Watch<br />ทุกหน้าเป็นต้นแบบดีไซน์และใช้ข้อมูลอากาศตัวอย่าง · แผนที่ใช้งานได้จริง</p><div className="review-controls"><div><button aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>Light</button><button aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>Dark</button></div><div><button aria-pressed={size === 'mobile'} onClick={() => setSize('mobile')}>Mobile</button><button aria-pressed={size === 'desktop'} onClick={() => setSize('desktop')}>Desktop</button></div></div></section><div className={`directions ${size}`}>{(Object.keys(directions) as Direction[]).map(key => <article className="concept" key={key}><div className="concept-heading"><span className="concept-number">{key.toUpperCase()}</span><div><h2>{directions[key].title}</h2><p>{directions[key].subtitle}</p></div>{key === 'c' && <span className="recommended">แนะนำ</span>}</div><div className="preview-frame"><iframe title={`Direction ${key.toUpperCase()} ${theme}`} src={`./prototype.html?direction=${key}&theme=${theme}`} key={theme + size + key} loading="eager"/></div><div className="concept-description"><p>{key === 'a' ? 'สงบแบบหน้าบรรณาธิการ พื้นผิวกระดาษ เส้นแบ่งบาง และข้อมูลที่มีจังหวะ' : key === 'b' ? 'แผนที่เต็มพื้นที่ โทน atmospheric blue และข้อมูลอากาศในพื้นที่ลอยตัว' : 'เอกลักษณ์ที่สมดุล ตัวเลขโดดเด่น ผิว sage และแผนที่ในกรอบที่สงบ'}</p><a href={`./prototype.html?direction=${key}&theme=${theme}`} target="_blank" rel="noreferrer">เปิดต้นแบบเต็มหน้าจอ ↗</a></div></article>)}</div><footer>ISOLATED EXPLORATION · ไม่มีการเปลี่ยนแปลง main, provider หรือเว็บ QA ปัจจุบัน</footer></main>;
}
createRoot(document.getElementById('root')!).render(<Review />);
