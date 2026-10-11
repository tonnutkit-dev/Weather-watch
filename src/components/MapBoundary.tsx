import { Component } from "react";
import type { ReactNode } from "react";
export class MapBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="map-status" role="status">
        แผนที่ยังไม่พร้อม ข้อมูลอากาศส่วนอื่นยังใช้งานได้{" "}
        <button onClick={() => window.location.reload()}>รีเฟรชหน้า</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
