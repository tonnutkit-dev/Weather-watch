// NON-SHIPPING audit build only. Production config and source stay unchanged.
import { defineConfig, mergeConfig } from 'vite';
import production from '../vite.config';
export default mergeConfig(production, defineConfig({
  plugins: [{
    name: 'ww-audit-only-observation', enforce: 'pre',
    transform(code, id) {
      if (id.endsWith('/src/app/App.tsx')) {
        return code.replace('export default function App() {', `export default function App() {
          if ((window as any).__WW_AUDIT) (window as any).__WW_AUDIT.renders.App = ((window as any).__WW_AUDIT.renders.App || 0) + 1;`);
      }
      if (id.endsWith('/src/components/SituationPanel.tsx')) {
        return code.replace('export function SituationPanel(p: Props) {', `export function SituationPanel(p: Props) {
          if ((window as any).__WW_AUDIT) (window as any).__WW_AUDIT.renders.SituationPanel = ((window as any).__WW_AUDIT.renders.SituationPanel || 0) + 1;`);
      }
      if (id.endsWith('/src/main.tsx')) {
        return code.replace('ReactDOM.createRoot', '(window as any).__WW_QUERY = queryClient;\nReactDOM.createRoot');
      }
      if (id.endsWith('/src/maps/GLCanvas.tsx')) {
        return code.replace('sync.current = () => {', `sync.current = () => {
          if ((window as any).__WW_AUDIT) (window as any).__WW_AUDIT.renders.mapSync = ((window as any).__WW_AUDIT.renders.mapSync || 0) + 1;`)
          .replace('map.current = m;', `map.current = m;
          (window as any).__WW_MAP = m;
          (window as any).__WW_HOOK_MAP?.(m, "maplibre");`);
      }
      if (id.endsWith('/src/maps/RasterCanvas.tsx')) {
        return code.replace('map.current = m;', `map.current = m;
          (window as any).__WW_MAP = m;
          (window as any).__WW_HOOK_MAP?.(m, "leaflet");`);
      }
      return undefined;
    }
  }],
  build: { outDir: 'audit-v03/dist-diagnostic', emptyOutDir: true },
}));

